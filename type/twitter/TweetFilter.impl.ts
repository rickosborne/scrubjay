import {TweetFilter} from './TweetFilter';
import {TweetJSON, TwitterEventStore} from './store/TwitterEventStore';
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

  public async publish(tweet: Tweet, source: TweetJSON): Promise<boolean> {
    if ((await this.twitterEventStore.findById(tweet.id)) != null) {
      return false;
    }
    if (tweet.replyUser == null) {
      return true;
    }
    const originalUser: TwitterUser | null = await this.twitterUserStore.findOneByName(tweet.replyUser);
    return originalUser != null;
  }
}
