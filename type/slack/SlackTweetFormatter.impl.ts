import * as slack from '@slack/web-api';
import {getLongDateTime} from '../../lib/time';
import {MediaTranscoder} from '../aphelocoma/MediaTranscoder';
import {Indexed, Tweet} from '../twitter/Tweet';
import {TweetEntities} from '../twitter/TweetEntities';
import {ImageBlock} from './block/ImageBlock';
import {MarkdownTextBlock} from './block/MarkdownTextBlock';
import {KnownBlockable} from './block/SlackBlock';
import {TextBlock} from './block/TextBlock';
import {Channel} from './Channel';
import {EntityExtractor} from './extractor/EntityExtractor';
import {HashtagExtractor} from './extractor/HashtagExtractor';
import {MediaExtractor} from './extractor/MediaExtractor';
import {MentionsExtractor} from './extractor/MentionsExtractor';
import {SymbolsExtractor} from './extractor/SymbolsExtractor';
import {UrlsExtractor} from './extractor/UrlsExtractor';
import {FeedChannel} from './FeedStore';
import {PostableMessage} from './PostableMessage';
import {RenderOptions} from './SlackBot';
import {SlackFormatBuilder} from './SlackFormatBuilder';
import {
  DelayedRenderActions,
  FOLLOW_EMOJI_DEFAULT,
  SlackTweetFormatter,
  TweetRenderingFlags
} from './SlackTweetFormatter';

export interface Chunk {
  converted: string;
  left: number;
  original: string;
  pad: boolean;
  right: number;
}

@SlackTweetFormatter.implementation
export class SlackTweetFormatterImpl implements SlackTweetFormatter {
  private readonly extractors: EntityExtractor<Indexed>[];

  constructor(
    @MediaTranscoder.required mediaTranscoder: MediaTranscoder
  ) {
    this.extractors = [
      new HashtagExtractor(),
      new UrlsExtractor(),
      new MediaExtractor(mediaTranscoder),
      new MentionsExtractor(),
      new SymbolsExtractor(),
    ];
  }

  protected adjustChunks(chunks: Chunk[], originalText: string): Chunk[] {
    let fudge = 0;
    return chunks.map(chunk => {
      fudge = this.findFudge(originalText, chunk.original, chunk.left, chunk.right, fudge);
      return {
        pad: chunk.pad,
        left: fudge + chunk.left,
        right: fudge + chunk.right,
        original: chunk.original,
        converted: chunk.converted,
      };
    });
  }

  // noinspection JSMethodCanBeStatic
  protected blockFromProfilePic(tweet: Tweet, flags: TweetRenderingFlags = {quote: ''}): ImageBlock | undefined {
    if (tweet == null || tweet.user == null || tweet.user.profileImage == null) {
      return undefined;
    }
    const img = tweet.user.profileImage.replace(/_normal[.]/i, '.');
    return new ImageBlock(img, `:${flags.followEmoji || FOLLOW_EMOJI_DEFAULT}:${tweet.user.name}`);
  }

  protected async blocksFromTweet(
    builder: SlackFormatBuilder,
    tweet: Tweet,
    flags: TweetRenderingFlags,
    later: DelayedRenderActions
  ): Promise<string> {
    const fields: TextBlock[] = [];
    if (tweet.created != null) {
      fields.push(new MarkdownTextBlock(`${flags.quote}_Sent: ${getLongDateTime(tweet.created)}_`));
    }
    fields.push(new MarkdownTextBlock(`${flags.quote}_ID: ${this.tweetIdLink(tweet.user.name, tweet.id)}_`));
    if (tweet.replyUser != null) {
      const originalLink = `<${this.twitterUrl(tweet.replyUser, tweet.replyTweetId)}|_In reply to ${tweet.replyUser}_>`;
      fields.push(new MarkdownTextBlock(`${flags.quote}${originalLink}`));
    }
    let toQuote: string | undefined;
    if (tweet.retweeted != null) {
      toQuote = await this.blocksFromTweet(
        builder,
        tweet.retweeted,
        Object.assign({retweeted: true}, flags, {quote: '>'}),
        later
      );
    } else if (tweet.quoted != null) {
      toQuote = await this.blocksFromTweet(
        builder,
        tweet.quoted,
        Object.assign({quoted: true}, flags, {quote: '>'}),
        later
      );
    }
    const updatedFlags = Object.assign({}, flags);
    if (flags.inReplyTo || tweet.replyUser != null) {
      updatedFlags.quote = '>';
    }
    let md = await this.markdownFromTweet(tweet, updatedFlags, later);
    if (toQuote != null) {
      md = md + '\n' + toQuote;
    }
    if (flags.quoted || flags.retweeted || flags.inReplyTo) {
      // do nothing
    } else {
      builder.section(
        new MarkdownTextBlock(md),
        fields.length === 0 ? undefined : fields,
        this.blockFromProfilePic(tweet, flags),
      );
    }
    return md;
  }

  protected async chunksForEntities(entities: TweetEntities, flags: TweetRenderingFlags, later: DelayedRenderActions): Promise<Chunk[]> {
    const unorderedChunks: Chunk[] = [];
    if (entities != null) {
      for (const extractor of this.extractors) {
        const items = extractor.access(entities);
        if (!Array.isArray(items)) {
          continue;
        }
        for (const item of items) {
          const original = extractor.originalText(item);
          const converted = await extractor.convert(item, flags, later);
          const [left, right] = item.indices;
          unorderedChunks.push({converted, left, original, right, pad: extractor.pad});
        }
      }
    }
    return unorderedChunks.sort((a, b) => a.left - b.left);
  }

  /**
   * Returns an offset/delta to adjust the chunk to completely hack unicode nonsense.
   */
  // noinspection JSMethodCanBeStatic
  protected findFudge(haystack: string, needle: string, left: number, right: number, fudge: number): number {
    if (haystack.substr(left, right) === needle) {
      return 0;  // it's right where we expect it to be
    }
    const fudgedLeftA = Math.max(0, left - Math.abs(fudge));
    const fudgedLeftB = Math.max(0, left + Math.abs(fudge));
    const actualLeft = haystack.indexOf(needle, fudgedLeftA);
    if (actualLeft >= fudgedLeftA && actualLeft <= fudgedLeftB) {
      return actualLeft - left;
    }
    const overall = haystack.indexOf(needle);
    if (overall >= 0) {
      return overall - left;
    }
    return fudge;
  }

  public linkForChannel(channel: Channel | FeedChannel): string {
    return `<#${channel.id}|${channel.name}>`;
  }

  protected async markdownFromTweet(tweet: Tweet, flags: TweetRenderingFlags, later: DelayedRenderActions): Promise<string> {
    const attribution = tweet.user == null || tweet.user.name == null ? ''
      : `*${this.userLink(tweet.user.name, flags.followEmoji)}* (${this.slackEscape(tweet.user.fullName)})`;
    // const explanation = flags.quoted ? 'Quoted ' : flags.retweeted ? 'Retweeted ' : flags.inReplyTo ? 'Replied to ' : '';
    const explanation = flags.quoted ? `Quoted ` : flags.inReplyTo ? `Replied to ` : '';
    const prefix = explanation === '' ? '' : '\n';
    const retweeted = tweet.retweeted == null || tweet.retweeted.user == null || tweet.retweeted.user.name == null ? ''
      : ` retweeted`;
    const lines = [`${prefix}${flags.quote}${explanation}${attribution}${retweeted}:`];
    if (tweet.retweeted == null) {
      const originalText: string = tweet.longText;
      const entities = tweet.longTextEntities;
      const sparseChunks = entities == null ? [] : await this.chunksForEntities(entities, flags, later);
      const adjustedChunks = this.adjustChunks(sparseChunks, originalText);
      const result = this.replaceChunks(adjustedChunks, originalText, flags);
      lines.push(result);
    }
    return lines.join('\n');
  }

  public async messagesFromTweet(tweet: Tweet, options: RenderOptions = {}): Promise<PostableMessage[]> {
    const messages: PostableMessage[] = [];
    const builder = new SlackFormatBuilder();
    const lateBlocks: KnownBlockable[] = [];
    const later: DelayedRenderActions = {
      addMessage: (m: PostableMessage) => messages.push(m),
      addBlock: (block: KnownBlockable) => lateBlocks.push(block),
    };
    await this.blocksFromTweet(builder, tweet, Object.assign({quote: ''}, options), later);
    builder.blocks.push(...lateBlocks);
    const message = PostableMessage.fromBlocks(
      builder.blocks.map(b => <slack.KnownBlock>b.block),
      `@${tweet.user.name}: ${tweet.longText}`
    );
    messages.unshift(message);
    return messages;
  }

  protected replaceChunks(sparseChunks: Chunk[], originalText: string, flags: TweetRenderingFlags) {
    let at = 0;
    let result = flags.quote;
    const process = flags.quote !== '' ? (s: string) => this.slackEscape(Tweet.unescapeText(s))
        .replace(/\n/g, '\n' + flags.quote)
      : (s: string) => this.slackEscape(Tweet.unescapeText(s));
    for (const chunk of sparseChunks) {
      if (chunk.left > at) {  // catch up
        const original = originalText.substring(at, chunk.left);
        result += process(original);
      }
      if (chunk.pad && !result.match(/\s$/)) {
        result += ' ';
      }
      result += chunk.converted;
      at = chunk.right;
    }
    if (at < originalText.length) {
      result += process(originalText.substring(at));
    }
    return result;
  }

  public slackEscape(s?: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // https://webapps.stackexchange.com/questions/86557/how-do-i-escape-formatting-characters-in-slack
      .replace(/([\\_*~`])/g, '\u00ad$1')
      ;
  }

  public tweetIdLink(username: string | undefined, statusId: string): string {
    const link = this.twitterUrl(username || 'i', statusId);
    return `<${link}|${statusId}>`;
  }

  public twitterUrl(username: string, statusId?: string): string {
    const base = `https://twitter.com/${username}`;
    return statusId == null ? base : `${base}/status/${statusId}`;
  }

  public userLink(name: string, emoji?: string | null): string {
    const n = name.replace(/^@/, '');
    const followerEmoji = emoji || FOLLOW_EMOJI_DEFAULT;
    return `<${this.twitterUrl(n)}|:${followerEmoji}:${n}>`;
  }
}
