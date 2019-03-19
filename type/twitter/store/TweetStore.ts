import {Tweet} from '../Tweet';
import {Identity} from '../../Identity';
import {TwitterUser} from '../TwitterUser';
import {injectableType} from 'inclined-plane';

export interface TweetStore {
  follows(active?: boolean): Promise<TwitterUser[]>;

  recentForIdentity(ident: Identity, count: number): Promise<Tweet[]>;

  store(tweet: Tweet): void;
}

export const TweetStore = injectableType<TweetStore>('TweetStore');
