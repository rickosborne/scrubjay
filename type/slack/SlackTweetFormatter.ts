import {Tweet} from '../twitter/Tweet';
import {KnownBlockable} from './block/SlackBlock';
import {PostableMessage} from './PostableMessage';
import {injectableType} from 'inclined-plane';
import {Channel} from './Channel';
import {FeedChannel} from './FeedStore';

export interface TweetRenderingFlags {
  inReplyTo?: boolean;
  quoted?: boolean;
  retweeted?: boolean;
}

export interface DelayedRenderActions {
  addBlock(block: KnownBlockable): void;

  addMessage(message: PostableMessage): void;
}

export interface SlackTweetFormatter {
  messagesFromTweet(tweet: Tweet): PostableMessage[];
  slackEscape(s: string): string;
  twitterUrl(username: string, statusId?: string): string;
  userLink(name: string): string;
  linkForChannel(channel: Channel | FeedChannel): string;
}

export const SlackTweetFormatter = injectableType<SlackTweetFormatter>('SlackTweetFormatter');
