import {injectableType} from 'inclined-plane';
import {SlackId} from './RTEvent';
import {Channel} from './Channel';
import {TwitterUser} from '../twitter/TwitterUser';

export interface FeedChannel {
  readonly id: SlackId;
  readonly name: string;
}

export interface FeedStore {
  readonly channels: Promise<FeedChannel[]>;

  channelsFor(user: TwitterUser): Promise<FeedChannel[]>;

  createFeed(channel: Channel): Promise<FeedChannel | null>;

  follow(channel: Channel, user: TwitterUser): Promise<boolean>;

  followsFor(channel: FeedChannel | Channel): Promise<TwitterUser[]>;
}

export const FeedStore = injectableType<FeedStore>('FeedStore');
