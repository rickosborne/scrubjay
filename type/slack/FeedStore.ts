import {injectableType} from 'inclined-plane';
import {SlackId} from './RTEvent';
import {Channel} from './Channel';
import {TwitterUser} from '../twitter/TwitterUser';

export interface FeedChannel {
  readonly id: SlackId;
  readonly name: string;
}

export interface ChannelAndFollowSummary {
  readonly channel: FeedChannel;
  readonly followNames: string[];
}

export interface FeedDelivery {
  readonly channelId: string;
  readonly deliveryDate: number;
  readonly tweetId: string;
}

export interface FeedStore {
  readonly channels: Promise<FeedChannel[]>;

  channelsAndFollows(): Promise<ChannelAndFollowSummary[]>;

  channelsFor(user: TwitterUser): Promise<FeedChannel[]>;

  createFeed(channel: Channel): Promise<FeedChannel>;

  delivered(channel: Channel | FeedChannel, tweetId: string): Promise<boolean>;

  deliveryFor(channel: Channel | FeedChannel, tweetId: string): Promise<FeedDelivery | null>;

  follow(channel: Channel, user: TwitterUser): Promise<boolean>;

  followsFor(channel: FeedChannel | Channel): Promise<TwitterUser[]>;
}

export const FeedStore = injectableType<FeedStore>('FeedStore');
