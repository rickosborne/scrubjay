import {Tweet} from './Tweet';
import {TwitterUser} from './TwitterUser';
import {injectableType} from 'inclined-plane';

export type TweetCallback = (tweet: Tweet) => void;

export interface TwitterClient {

  addUsers(...users: TwitterUser[]): this;

  connect(backoff?: number): void;

  fetchUser(name: string): Promise<TwitterUser>;

  onTweet(callback: TweetCallback): void;
}

export const TwitterClient = injectableType<TwitterClient>('TwitterClient');
