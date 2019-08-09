import {TweetJSON} from './store/TwitterEventStore';
import {Tweet} from './Tweet';
import {injectableType} from 'inclined-plane';

export interface TweetFilter {
  publish(tweet: Tweet, source: TweetJSON): Promise<boolean>;
}

export const TweetFilter = injectableType<TweetFilter>('TweetFilter');
