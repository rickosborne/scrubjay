import * as process from 'process';

import defaultEnv, {Env} from './lib/env';

import 'inclined-plane';
import './type/JSONFormatter.impl';
import './type/LogSwitch.impl';
import './type/MysqlClient';
import './type/NotifyQueue.impl';
import './type/aws/AWSFileConfigurer';
import './type/aws/SQSAdapter.impl';
import './type/config/ScrubjayConfig.impl';
import './type/config/ScrubjayConfigStore.impl';
import './type/twitter/TweetFilter.impl';
import './type/twitter/TwitterClient.impl';
import './type/twitter/store/TweetStore.impl';
import './type/twitter/store/TwitterEventStore.impl';
import './type/twitter/store/TwitterUserStore.impl';
import {TwitterClient} from './type/twitter/TwitterClient';
import {SQSAdapter, TypedQueue} from './type/aws/SQS';
import {buildInstance} from 'inclined-plane';
import {TweetStore} from './type/twitter/store/TweetStore';
import {TwitterUserStore} from './type/twitter/store/TwitterUserStore';
import {TweetJSON, TwitterEventStore} from './type/twitter/store/TwitterEventStore';
import {Tweet} from './type/twitter/Tweet';
import {TweetFilter} from './type/twitter/TweetFilter';
import {TwitterUser} from './type/twitter/TwitterUser';

class FeederImpl {
  private readonly tweetQueue: Promise<TypedQueue<TweetJSON>>;

  constructor(
    @TwitterClient.required private readonly twitterClient: TwitterClient,
    @SQSAdapter.required sqsAdapter: SQSAdapter,
    @Env.required private readonly env: Env,
    @TweetStore.required private readonly tweetStore: TweetStore,
    @TwitterUserStore.required private readonly twitterUserStore: TwitterUserStore,
    @TwitterEventStore.required private readonly twitterEventStore: TwitterEventStore,
    @TweetFilter.required private readonly tweetFilter: TweetFilter,
  ) {
    env.debug(() => `Feeder`);
    this.tweetQueue = sqsAdapter.queueForType<TweetJSON>(TweetJSON);
  }

  private async backfillTweets(users: TwitterUser[], queue: TypedQueue<TweetJSON>): Promise<void> {
    for (const user of users) {
      const onRecentError = defaultEnv.debugFailure(() => `FeederImpl.backfillTweets.recent(${user.name})`);
      const onHandleError = defaultEnv.debugFailure(() => `FeederImpl.backfillTweets.recent.handleTweets(${user.name})`)
      if (user.name != null) {
        this.env.debug(() => `FeederImpl.backfillTweets user ${user.name}`);
        try {
          const tweets = await this.twitterClient.recent(user);
          try {
            await this.handleTweets(queue, tweets);
          } catch (f) {
            onHandleError(f);
          }
        } catch (e) {
          onRecentError(e);
        }
      }
    }
  }

  protected async handleTweets(queue: TypedQueue<TweetJSON>, tweets: Tweet[]): Promise<void> {
    const newTweets = await this.tweetFilter.publish(tweets);
    for (const tweet of newTweets) {
      if (tweet != null && tweet.source != null) {
        this.env.debug(() => `FeederImpl.handleTweet ${tweet.id} @${tweet.user.name} ${tweet.longText}`);
        await queue.add(tweet.source);
        await this.tweetStore.store(tweet);
        await this.twitterEventStore.save(tweet.source);
      }
    }
  }

  public async start(): Promise<void> {
    const users: TwitterUser[] = await this.tweetStore.follows();
    const queue: TypedQueue<TweetJSON> = await this.tweetQueue;
    this.twitterClient.addUsers(...users);
    this.twitterClient.onTweet((tweet) => this.handleTweets(queue, [tweet]));
    this.twitterClient.connect();
    await this.backfillTweets(users, queue);
  }
}

const feeder = buildInstance(FeederImpl);
feeder.start().catch(defaultEnv.debugFailure('feeder.start()', () => process.exit(1)));
