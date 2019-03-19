import {injectableType} from 'inclined-plane';
import * as Twitter from 'twitter';

export type TwitterCredentials = Twitter.AccessTokenOptions | Twitter.BearerTokenOptions;

export interface TwitterConfig {
  readonly accessTokenKey: string;
  readonly accessTokenSecret: string;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly credentials: TwitterCredentials;
}

export const TwitterConfig = injectableType<TwitterConfig>('TwitterConfig');
