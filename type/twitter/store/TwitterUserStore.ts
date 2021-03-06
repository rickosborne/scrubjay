import {TwitterUser} from '../TwitterUser';
import {injectableType} from 'inclined-plane';

export interface TwitterUserStore {
  findOneByName(username: string): Promise<TwitterUser | null>;

  merge(user: TwitterUser): Promise<TwitterUser | null>;
}

export const TwitterUserStore = injectableType<TwitterUserStore>('TwitterUserStore');
