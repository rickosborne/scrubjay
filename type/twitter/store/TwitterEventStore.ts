import {Tweet} from '../Tweet';
import {injectableType} from 'inclined-plane';

export interface TweetJSON {
  [key: string]: {
    [key: string]: string;
  };
}

export const TweetJSON = injectableType<TweetJSON>('TweetJSON');

export interface TwitterEventStore {
  findById(statusId: string): Promise<Tweet | null>;

  latest(retweetsAcceptable?: boolean, repliesAcceptable?: boolean): Promise<Tweet | undefined>;

  latestFor(username: string): Promise<Tweet | undefined>;

  save(event: TweetJSON): Promise<void>;
}

export const TwitterEventStore = injectableType<TwitterEventStore>('TwitterEventStore');
