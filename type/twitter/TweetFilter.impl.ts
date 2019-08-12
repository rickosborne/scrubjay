import {TweetFilter} from './TweetFilter';
import {TwitterEventStore} from './store/TwitterEventStore';
import {Tweet} from './Tweet';
import {TweetStore} from './store/TweetStore';
import {TwitterUser} from './TwitterUser';
import {TwitterUserStore} from './store/TwitterUserStore';
import {Env} from '../../lib/env';

@TweetFilter.implementation
class TweetFilterImpl implements TweetFilter {
  constructor(
    @TweetStore.required private readonly tweetStore: TweetStore,
    @TwitterEventStore.required private readonly twitterEventStore: TwitterEventStore,
    @TwitterUserStore.required private readonly twitterUserStore: TwitterUserStore,
    @Env.required private readonly env: Env,
  ) {
  }

  public async publish(tweets: Tweet[]): Promise<Tweet[]> {
    if (tweets == null || tweets.length < 1) {
      this.env.debug('TweetFilterImpl.publish given empty tweets');
      return [];
    }
    const ids = tweets.map(t => t.id);
    const newIds = await this.tweetStore.notExist(ids);
    const newTweets = tweets.filter(t => newIds.indexOf(t.id) >= 0);
    if (newTweets.length < 1) {
      this.env.debug(() => `TweetFilterImpl.publish: No new tweets: ${ids} == ${newIds}`);
      return [];
    }
    const publishable = (await Promise.all(tweets.map(async (tweet) => {
      if (tweet.replyUser == null) {
        return tweet;
      }
      const originalUser: TwitterUser | null = await this.twitterUserStore.findOneByName(tweet.replyUser);
      if (originalUser != null) {
        this.env.debug(() => `TweetFilterImpl.publish: Reply to ${originalUser.name} from ${tweet.user.name}`);
        return tweet;
      }
      return undefined;
    }))).filter(tweet => tweet != null) as Tweet[];
    if (publishable.length > 0) {
      this.env.debug(() => `TweetFilterImpl.publish: Publishing ${publishable.map(t => t.id)}`);
    } else {
      this.env.debug('TweetFilterImpl.publish: Nothing to publish');
    }
    return publishable;
  }
}
