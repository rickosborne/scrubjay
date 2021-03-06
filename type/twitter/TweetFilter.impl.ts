import {TweetFilter} from './TweetFilter';
import {TwitterEventStore} from './store/TwitterEventStore';
import {Tweet} from './Tweet';
import {TwitterUser} from './TwitterUser';
import {TwitterUserStore} from './store/TwitterUserStore';
import {Env} from '../../lib/env';
import {TweetStore} from './store/TweetStore';

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
    // const ids = tweets.map(t => t.id);
    // const newIds = await this.tweetStore.notExist(ids);
    // const newTweets = tweets.filter(t => newIds.indexOf(t.id) >= 0);
    // if (newTweets.length < 1) {
    //   this.env.debug(() => `TweetFilterImpl.publish: No new tweets: ${ids} == ${newIds}`);
    //   return [];
    // }
    const publishable = (await Promise.all(tweets.map(async (tweet) => {
      const anyUndelivered = await this.tweetStore.anyUndelivered(tweet.id, tweet.user.name);
      if (!anyUndelivered) {
        this.env.debug(() => `TweetFilterImpl.publish: All deliveries already logged for @${tweet.user.name} ${tweet.id}`);
        return undefined;
      }
      if (tweet.replyUser == null) {
        this.env.debug(() => `TweetFilterImpl.publish: Original tweet from @${tweet.user.name} ${tweet.id}`);
        return tweet;
      }
      const originalUser: TwitterUser | null = await this.twitterUserStore.findOneByName(tweet.replyUser);
      if (originalUser != null) {
        this.env.debug(() => `TweetFilterImpl.publish: Reply to @${originalUser.name} from ${tweet.user.name}`);
        return tweet;
      } else {
        this.env.debug(() => `TweetFilterImpl.publish: We don't follow @${tweet.replyUser}`);
        return undefined;
      }
    }))).filter(tweet => tweet != null) as Tweet[];
    if (publishable.length > 0) {
      this.env.debug(() => `TweetFilterImpl.publish: Publishing ${publishable.map(t => t.id)}`);
    } else {
      this.env.debug('TweetFilterImpl.publish: Nothing to publish');
    }
    return publishable;
  }
}
