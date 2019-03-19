import {Indexed, Tweet} from '../twitter/Tweet';
import {ImageBlock} from './block/ImageBlock';
import {SlackFormatBuilder} from './SlackFormatBuilder';
import {TextBlock} from './block/TextBlock';
import {MarkdownTextBlock} from './block/MarkdownTextBlock';
import {TweetEntities} from '../twitter/TweetEntities';
import {fixed, getTimeHHMM} from '../../lib/time';
import {PostableMessage} from './PostableMessage';
import {KnownBlockable} from './block/SlackBlock';
import * as slack from '@slack/client';
import {DelayedRenderActions, MONTHS, SlackTweetFormatter, TweetRenderingFlags, WEEKDAYS} from './SlackTweetFormatter';
import {TweetHashtag} from '../twitter/TweetHashtag';
import {TweetUrl} from '../twitter/TweetUrl';
import {TweetMedia} from '../twitter/TweetMedia';
import {TweetMention} from '../twitter/TweetMention';
import {TweetSymbol} from '../twitter/TweetSymbol';
import {Channel} from './Channel';
import {FeedChannel} from './FeedStore';

export interface EntityExtractor<T extends Indexed> {

  pad: boolean;

  access(entities: TweetEntities): T[];

  convert(item: T, later: DelayedRenderActions): string;

  originalText(item: T): string;
}

export interface Chunk {
  converted: string;
  left: number;
  original: string;
  pad: boolean;
  right: number;
}

const extractors: EntityExtractor<Indexed>[] = [
  {
    access: ents => ents.hashtags,
    convert: (hashtag: TweetHashtag) => `_#${hashtag.text}_`,
    originalText: (item: TweetHashtag) => `#${item.text}`,
    pad: true,
  },
  {
    access: ents => ents.urls,
    convert: (url: TweetUrl) => `<${url.expanded}|${url.display}>`,
    originalText: (item: TweetUrl) => item.url,
    pad: true,
  },
  {
    access: ents => ents.media,
    convert: (media: TweetMedia, later: DelayedRenderActions) => {
      if (media.videoInfo != null && media.videoInfo.variants != null) {
        const best = media.videoInfo.variants
          .filter(variant => variant != null
            && variant.url != null
            && variant.bitrate != null
            && variant.contentType === TweetMedia.VIDEO_MP4)
          .reduce((left, right) => left == null ? right : right == null ? left : left.bitrate > right.bitrate ? left : right, null);
        if (best != null && best.url != null) {
          later.addMessage(PostableMessage.from(`<${best.url}>`));
        }
      } else if (media.url != null) {
        later.addMessage(PostableMessage.from(`<${media.url}>`));
      }
      return `<${media.url}|${media.displayUrl}>`;
    },
    originalText: (item: TweetMedia) => item.url,
    pad: true
  },
  {
    access: ents => ents.mentions,
    convert: (mention: TweetMention) => `<https://twitter.com/${mention.name}|@${mention.name}>`,
    originalText: (item: TweetMention) => `@${item.name}`,
    pad: false,
  },
  {
    access: ents => ents.symbols,
    convert: (symbol: TweetSymbol) => `_${symbol.text}_`,
    originalText: (item: TweetSymbol) => item.text,
    pad: true
  },
];

@SlackTweetFormatter.provider
export class SlackTweetFormatterImpl implements SlackTweetFormatter {

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
  protected blockFromProfilePic(tweet: Tweet) {
    return tweet == null || tweet.user == null || tweet.user.profileImage == null ? null
      : new ImageBlock(tweet.user.profileImage, `@${tweet.user.name}`);
  }

  protected blocksFromTweet(builder: SlackFormatBuilder, tweet: Tweet, flags: TweetRenderingFlags, later: DelayedRenderActions) {
    const fields: TextBlock[] = [];
    const quote = flags.inReplyTo || flags.retweeted || flags.quoted ? '>' : '';
    if (tweet.created != null) {
      fields.push(new MarkdownTextBlock(`${quote}_Sent: ${this.formatDateTime(tweet.created)}_`));
    }
    fields.push(new MarkdownTextBlock(`${quote}_ID: ${tweet.id}_`));
    if (tweet.replyUser != null) {
      const originalLink = `<${this.twitterUrl(tweet.replyUser, tweet.replyTweetId)}|_In reply to ${tweet.replyUser}_>`;
      fields.push(new MarkdownTextBlock(`${quote}${originalLink}`));
    }
    builder.section(
      new MarkdownTextBlock(this.markdownFromTweet(tweet, flags, later)),
      fields.length === 0 ? null : fields,
      this.blockFromProfilePic(tweet),
    );
  }

  // noinspection JSMethodCanBeStatic
  protected chunksForEntities(entities: TweetEntities, later: DelayedRenderActions): Chunk[] {
    const unorderedChunks: Chunk[] = [];
    if (entities != null) {
      for (const extractor of extractors) {
        const items = extractor.access(entities);
        if (!Array.isArray(items)) {
          continue;
        }
        for (const item of items) {
          const original = extractor.originalText(item);
          const converted = extractor.convert(item, later);
          const [left, right] = item.indices;
          unorderedChunks.push({converted, left, original, right, pad: extractor.pad});
        }
      }
    }
    return unorderedChunks.sort((a, b) => a.left - b.left);
  }

  // noinspection JSMethodCanBeStatic
  protected findFudge(haystack: string, needle: string, left: number, right: number, fudge: number): number {
    if (haystack.substr(left, right) === needle) {
      return left;
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
  }

  // noinspection JSMethodCanBeStatic
  protected formatDateTime(dt: Date): string {
    const weekday = WEEKDAYS[dt.getDay()];
    const month = MONTHS[dt.getMonth()];
    const date = `${fixed(dt.getDate())} ${month} ${dt.getFullYear()}`;
    const time = getTimeHHMM(dt);
    return `${weekday}, ${date} at ${time}`;
  }

  public linkForChannel(channel: Channel | FeedChannel): string {
    return `<#${channel.id}|${channel.name}>`;
  }

  protected markdownFromTweet(tweet: Tweet, flags: TweetRenderingFlags, later: DelayedRenderActions): string {
    const attribution = `*${this.userLink(tweet.user.name)}* (${tweet.user.fullName})`;
    const explanation = flags.quoted ? 'Quoted ' : flags.retweeted ? 'Retweeted ' : flags.inReplyTo ? 'Replied to ' : '';
    const retweeted = tweet.retweeted == null ? ''
      : ` retweeted ${this.userLink(tweet.retweeted.user.name)} (${tweet.retweeted.user.fullName})`;
    const lines = [`${explanation}${attribution}${retweeted}:`];
    const originalText: string = tweet.longText;
    const sparseChunks = this.chunksForEntities(tweet.longTextEntities, later);
    const adjustedChunks = this.adjustChunks(sparseChunks, originalText);
    const result = this.replaceChunks(adjustedChunks, originalText, flags);
    lines.push(result);
    return lines.join('\n');
  }

  public messagesFromTweet(tweet: Tweet): PostableMessage[] {
    const messages: PostableMessage[] = [];
    const builder = new SlackFormatBuilder();
    const lateBlocks: KnownBlockable[] = [];
    const later: DelayedRenderActions = {
      addMessage: (m: PostableMessage) => messages.push(m),
      addBlock: (block: KnownBlockable) => lateBlocks.push(block),
    };
    this.blocksFromTweet(builder, tweet, {}, later);
    if (tweet.quoted != null) {
      this.blocksFromTweet(builder, tweet.quoted, {quoted: true}, later);
    }
    builder.blocks.push(...lateBlocks);
    const message = PostableMessage.from(builder.blocks.map(b => <slack.KnownBlock>b.block))
      .withText(`@${tweet.user.name}:\n${this.slackEscape(tweet.text)}`);
    messages.unshift(message);
    return messages;
  }

  protected replaceChunks(sparseChunks: Chunk[], originalText: string, flags: TweetRenderingFlags) {
    let at = 0;
    const quote = flags.quoted || flags.retweeted || flags.inReplyTo;
    let result = quote ? '>' : '';
    const process = quote ? (s: string) => this.slackEscape(Tweet.unescapeText(s)).replace(/\n/g, '\n>')
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

  public slackEscape(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/([\\_*~`])/g, '\\$1')
      ;
  }

  public twitterUrl(username: string, statusId?: string): string {
    const base = `https://twitter.com/${username}`;
    return statusId == null ? base : `${base}/status/${statusId}`;
  }

  public userLink(name: string): string {
    return `<${this.twitterUrl(name)}|@${name}>`;
  }
}