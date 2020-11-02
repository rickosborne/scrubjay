import {injectableType} from 'inclined-plane';
import {Tweet} from './Tweet';
import {TwitterUser} from './TwitterUser';

export type TweetCallback = (tweet: Tweet) => void;

export enum TwitterClientState {
  DISCONNECTED = 'disconnected',
  BACKOFF = 'backoff',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

export interface TwitterClient {

  lastConnectedTime: Date | undefined;

  state: TwitterClientState;

  tweetsSinceLastConnect: number;

  addUsers(...users: TwitterUser[]): this;

  connect(backoff?: number): void;

  fetchTweet(id: string): Promise<Tweet | undefined>;

  fetchUser(name: string): Promise<TwitterUser>;

  onTweet(callback: TweetCallback): void;

  recent(user: TwitterUser, count?: number): Promise<Tweet[]>;
}

export const TwitterClient = injectableType<TwitterClient>('TwitterClient');
