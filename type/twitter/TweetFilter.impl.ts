import {TweetFilter} from './TweetFilter';
import {TwitterEventStore} from './store/TwitterEventStore';
import {Tweet} from './Tweet';
import {TweetStore} from './store/TweetStore';
import {TwitterUser} from './TwitterUser';
import {TwitterUserStore} from './store/TwitterUserStore';

@TweetFilter.implementation
class TweetFilterImpl implements TweetFilter {
  constructor(
    @TweetStore.required private readonly tweetStore: TweetStore,
    @TwitterEventStore.required private readonly twitterEventStore: TwitterEventStore,
    @TwitterUserStore.required private readonly twitterUserStore: TwitterUserStore,
  ) {
  }

  public async publish(tweets: Tweet[]): Promise<Tweet[]> {
    if (tweets == null || tweets.length < 1) {
      return [];
    }
    const ids = tweets.map(t => t.id);
    const newIds = await this.tweetStore.notExist(ids);
    const newTweets = tweets.filter(t => newIds.indexOf(t.id) >= 0);
    if (newTweets.length < 1) {
      return [];
    }
    return (await Promise.all(tweets.map(async (tweet) => {
      if (tweet.replyUser == null) {
        return tweet;
      }
      const originalUser: TwitterUser | null = await this.twitterUserStore.findOneByName(tweet.replyUser);
      return originalUser != null ? tweet : undefined;
    }))).filter(tweet => tweet != null) as Tweet[];
  }
}
