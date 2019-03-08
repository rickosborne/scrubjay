import {Indexed, Tweet} from '../twitter/Tweet';
import {SlackFormatBuilder} from './SlackFormatBuilder';
import {MarkdownTextBlock} from './block/MarkdownTextBlock';
import {ImageBlock} from './block/ImageBlock';
import {TweetEntities} from '../twitter/TweetEntities';
import {TweetUrl} from '../twitter/TweetUrl';
import {TweetHashtag} from '../twitter/TweetHashtag';
import {TweetMedia} from '../twitter/TweetMedia';
import {TweetMention} from '../twitter/TweetMention';
import {TweetSymbol} from '../twitter/TweetSymbol';
import {SlackBlock} from './block/SlackBlock';
import * as slack from '@slack/client';
import {TextBlock} from './block/TextBlock';
import {PostableMessage} from './SlackClient';

interface EntityExtractor<T extends Indexed> {
  access(entities: TweetEntities): T[];

  convert(item: T, later: DelayedRenderActions): string;
}

interface Chunk {
  converted: string;
  left: number;
  right: number;
}

interface TweetRenderingFlags {
  inReplyTo?: boolean;
  quoted?: boolean;
  retweeted?: boolean;
}

interface DelayedRenderActions {
  addBlock(block: SlackBlock): void;

  addMessage(message: PostableMessage): void;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const extractors: EntityExtractor<Indexed>[] = [
  {
    access: ents => ents.hashtags,
    convert: (hashtag: TweetHashtag) => `_#${hashtag.text}_`
  },
  {
    access: ents => ents.urls,
    convert: (url: TweetUrl) => `<${url.expanded}|${url.display}>`
  },
  {
    access: ents => ents.media,
    convert: (media: TweetMedia, later: DelayedRenderActions) => {
      later.addMessage(PostableMessage.from(`<${media.url}>`));
      // later.addBlock(new ImageBlock(media.url, media.displayUrl));
      return `<${media.url}|${media.displayUrl}>`;
    }
  },
  {
    access: ents => ents.mentions,
    convert: (mention: TweetMention) => `<https://twitter.com/${mention.name}|@${mention.name}>`
  },
  {
    access: ents => ents.symbols,
    convert: (symbol: TweetSymbol) => `_${symbol.text}_`
  },
];

export class SlackTweetFormatter {

  // noinspection JSMethodCanBeStatic
  private blockFromProfilePic(tweet: Tweet) {
    return tweet == null || tweet.user == null || tweet.user.profileImage == null ? null
      : new ImageBlock(tweet.user.profileImage, `@${tweet.user.name}`);
  }

  private blocksFromTweet(builder: SlackFormatBuilder, tweet: Tweet, flags: TweetRenderingFlags, later: DelayedRenderActions) {
    const fields: TextBlock[] = [];
    const quote = flags.inReplyTo || flags.retweeted || flags.quoted ? '>' : '';
    if (tweet.created != null) {
      fields.push(new MarkdownTextBlock(`${quote}_Sent: ${this.formatDateTime(tweet.created)}_`));
    }
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
  private chunksForEntities(entities: TweetEntities, later: DelayedRenderActions): Chunk[] {
    const unorderedChunks: Chunk[] = [];
    if (entities != null) {
      for (const extractor of extractors) {
        const items = extractor.access(entities);
        if (!Array.isArray(items)) {
          continue;
        }
        for (const item of items) {
          const converted = extractor.convert(item, later);
          const [left, right] = item.indices;
          unorderedChunks.push({converted, left, right});
        }
      }
    }
    return unorderedChunks.sort((a, b) => a.left - b.left);
  }

  private formatDateTime(dt: Date): string {
    const weekday = WEEKDAYS[dt.getDay()];
    const month = MONTHS[dt.getMonth()];
    const date = `${this.lpad(dt.getDate(), '0', 2)} ${month} ${dt.getFullYear()}`;
    const time = `${this.lpad(dt.getHours(), '0', 2)}:${this.lpad(dt.getMinutes(), '0', 2)}`;
    return `${weekday}, ${date} at ${time}`;
  }

  // noinspection JSMethodCanBeStatic
  public lpad(suffix: string | number, prefix: string, desiredLength: number) {
    const suff = '' + suffix;
    if (suff.length === desiredLength) {
      return suff;
    }
    return prefix.repeat(desiredLength - suff.length) + suff;
  }

  private markdownFromTweet(tweet: Tweet, flags: TweetRenderingFlags, later: DelayedRenderActions): string {
    const attribution = `*${this.userLink(tweet.user.name)}* (${tweet.user.fullName}):`;
    const explanation = flags.quoted ? 'Quoted ' : flags.retweeted ? 'Retweeted ' : flags.inReplyTo ? 'Replied to ' : '';
    const lines = [`${explanation}${attribution}`];
    const originalText: string = tweet.longText;
    const entities: TweetEntities = tweet.extended == null || tweet.extended.entities == null ? tweet.entities : tweet.extended.entities;
    const sparseChunks = this.chunksForEntities(entities, later);
    const result = this.replaceChunks(sparseChunks, originalText, flags);
    lines.push(result);
    return lines.join('\n');
  }

  public messagesFromTweet(tweet: Tweet): PostableMessage[] {
    const messages: PostableMessage[] = [];
    const builder = new SlackFormatBuilder();
    const lateBlocks: SlackBlock[] = [];
    const later: DelayedRenderActions = {
      addMessage: (m: PostableMessage) => messages.push(m),
      addBlock: (block: SlackBlock) => lateBlocks.push(block),
    };
    this.blocksFromTweet(builder, tweet, {}, later);
    if (tweet.quoted != null) {
      this.blocksFromTweet(builder, tweet.quoted, {quoted: true}, later);
    }
    builder.blocks.push(...lateBlocks);
    const message = PostableMessage.from(builder.blocks.map(b => <slack.KnownBlock>b.block));
    messages.unshift(message);
    return messages;
  }

  private replaceChunks(sparseChunks: Chunk[], originalText: string, flags: TweetRenderingFlags) {
    let at = 0;
    const quote = flags.quoted || flags.retweeted || flags.inReplyTo;
    let result = quote ? '>' : '';
    const process = quote ? s => this.slackEscape(Tweet.unescapeText(s)).replace(/\n/g, '\n>')
      : s => this.slackEscape(Tweet.unescapeText(s));
    for (const chunk of sparseChunks) {
      if (chunk.left > at) {  // catch up
        result += process(originalText.substring(at, chunk.left));
      }
      result += chunk.converted;
      at = chunk.right;
    }
    if (at < originalText.length) {
      result += process(originalText.substr(at));
    }
    return result;
  }

// noinspection JSMethodCanBeStatic
  public slackEscape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/([\\_*~`])/g, '\\$1')
      ;
  }

  // noinspection JSMethodCanBeStatic
  public twitterUrl(username: string, statusId?: string): string {
    const base = `https://twitter.com/${username}`;
    return statusId == null ? base : `${base}/status/${statusId}`;
  }

  // noinspection JSMethodCanBeStatic
  public userLink(name: string): string {
    return `<${this.twitterUrl(name)}|@${name}>`;
  }
}

export const slackTweetFormatter = new SlackTweetFormatter();
