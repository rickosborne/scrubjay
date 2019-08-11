import {Tweet} from './Tweet';
import {injectableType} from 'inclined-plane';

export interface TweetFilter {
  publish(tweets: Tweet[]): Promise<Tweet[]>;
}

export const TweetFilter = injectableType<TweetFilter>('TweetFilter');
