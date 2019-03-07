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
import {TwitterUser} from '../twitter/TwitterUser';

interface EntityExtractor<T extends Indexed> {
  access(entities: TweetEntities): T[];

  convert(item: T, addBlock: (block: SlackBlock) => void): string;
}

interface Chunk {
  converted: string;
  left: number;
  right: number;
}

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
    convert: (media: TweetMedia, addBlock) => {
      addBlock(new ImageBlock(media.url, media.displayUrl));
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
  public blockify(tweet: Tweet): slack.KnownBlock[] {
    const builder = new SlackFormatBuilder();
    const lateBlocks: SlackBlock[] = [];
    builder.section(
      new MarkdownTextBlock(this.markdownFromTweet(tweet, block => lateBlocks.push(block))),
      null,
      tweet.user.profileImage == null ? null : new ImageBlock(tweet.user.profileImage, `@${tweet.user.name}`),
    );
    lateBlocks.forEach(block => builder.blocks.push(block));
    return builder.blocks.map(b => <slack.KnownBlock>b.block);
  }

  private chunksForEntities(entities: TweetEntities, addBlock: (block: SlackBlock) => void): Chunk[] {
    const unorderedChunks: Chunk[] = [];
    if (entities != null) {
      for (const extractor of extractors) {
        const items = extractor.access(entities);
        if (!Array.isArray(items)) {
          continue;
        }
        for (const item of items) {
          const converted = extractor.convert(item, addBlock);
          const [left, right] = item.indices;
          unorderedChunks.push({converted, left, right});
        }
      }
    }
    return unorderedChunks.sort((a, b) => a.left - b.left);
  }

  private markdownFromTweet(tweet: Tweet, addBlock: (block: SlackBlock) => void): string {
    const lines = [`*@${tweet.user.name}* (${tweet.user.fullName}):`];
    const originalText: string = Tweet.unescapeText(tweet.longText);
    const entities: TweetEntities = tweet.extended == null || tweet.extended.entities == null ? tweet.entities : tweet.extended.entities;
    const sparseChunks = this.chunksForEntities(entities, addBlock);
    const result = this.replaceChunks(sparseChunks, originalText);
    lines.push(result);
    return lines.join('\n');
  }

  private replaceChunks(sparseChunks: Chunk[], originalText: string) {
    let at = 0;
    let result = '';
    for (const chunk of sparseChunks) {
      if (chunk.left > at) {  // catch up
        result += this.slackEscape(originalText.substring(at, chunk.left));
      }
      result += chunk.converted;
      at = chunk.right;
    }
    if (at < originalText.length) {
      result += this.slackEscape(originalText.substr(at));
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

  public userLink(name: string): string {
    return `<https://twitter.com/${name}|@${name}>`;
  }
}

export const slackTweetFormatter = new SlackTweetFormatter();
