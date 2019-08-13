import {Tweet} from '../Tweet';
import {Identity} from '../../Identity';
import {TwitterUser} from '../TwitterUser';
import {injectableType} from 'inclined-plane';

export interface TweetStore {
  anyUndelivered(id: string, author?: string): Promise<boolean>;

  follows(active?: boolean): Promise<TwitterUser[]>;

  notExist(statusIds: string[]): Promise<string[]>;

  recentForIdentity(ident: Identity, count: number): Promise<Tweet[]>;

  store(tweet: Tweet): Promise<boolean>;
}

export const TweetStore = injectableType<TweetStore>('TweetStore');
