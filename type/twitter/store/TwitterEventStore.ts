import {Tweet} from '../Tweet';
import {injectableType} from 'inclined-plane';

export interface TwitterEventStore {
  findById(statusId: string): Promise<Tweet | null>;

  latest(retweetsAcceptable?: boolean, repliesAcceptable?: boolean): Promise<Tweet>;

  latestFor(username: string): Promise<Tweet>;

  save(event: { [key: string]: { [key: string]: string } }): void;
}

export const TwitterEventStore = injectableType<TwitterEventStore>('TwitterEventStore');
