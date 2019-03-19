import {Tweet} from '../twitter/Tweet';
import {KnownBlockable} from './block/SlackBlock';
import {PostableMessage} from './PostableMessage';
import {injectableType} from 'inclined-plane';
import {Channel} from './Channel';
import {FeedChannel} from './FeedStore';
import {RenderOptions} from './SlackBot';

export const FOLLOW_EMOJI_DEFAULT = 'bird';

export interface TweetRenderingFlags {
  followEmoji?: string;
  inReplyTo?: boolean;
  quoted?: boolean;
  retweeted?: boolean;
}

export interface DelayedRenderActions {
  addBlock(block: KnownBlockable): void;

  addMessage(message: PostableMessage): void;
}

export interface SlackTweetFormatter {
  linkForChannel(channel: Channel | FeedChannel): string;

  messagesFromTweet(tweet: Tweet, options?: RenderOptions): PostableMessage[];

  slackEscape(s: string): string;

  twitterUrl(username: string, statusId?: string): string;

  userLink(name: string, emoji?: string): string;
}

export const SlackTweetFormatter = injectableType<SlackTweetFormatter>('SlackTweetFormatter');
