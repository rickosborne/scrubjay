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

class FeederImpl {
  private readonly tweetQueue: Promise<TypedQueue<TweetJSON>>;

  constructor(
    @TwitterClient.required private readonly twitterClient: TwitterClient,
    @SQSAdapter.required sqsAdapter: SQSAdapter,
    @Env.required private readonly env: Env,
    @TweetStore.required private readonly tweetStore: TweetStore,
    @TwitterUserStore.required private readonly twitterUserStore: TwitterUserStore,
    @TwitterEventStore.required private readonly twitterEventStore: TwitterEventStore,
  ) {
    env.debug(() => `Feeder`);
    this.tweetQueue = sqsAdapter.queueForType<TweetJSON>(TweetJSON);
  }

  public async start(): Promise<void> {
    const users = await this.tweetStore.follows();
    const queue = await this.tweetQueue;
    this.twitterClient.addUsers(...users);
    this.twitterClient.onTweet((tweet) => {
      this.env.debug(() => this.env.debug(() => `FeederImpl.onTweet ${tweet.id} ${tweet.user.name}`));
      const source = tweet.source;
      if (source != null) {
        queue.add(source);
      }
    });
    this.twitterClient.connect();
    for (const user of users) {
      if (user.name != null) {
        this.env.debug(() => `FeederImpl.start user ${user.name}`);
        const tweetPairs = await this.twitterClient.recent(user);
        for (const [tweet, json] of tweetPairs) {
          const existing = await this.twitterEventStore.findById(tweet.id);
          if (existing == null) {
            this.env.debug(() => `FeederImpl.start recent ${tweet.id} ${tweet.longText}`);
            await queue.add(json);
            await this.tweetStore.store(tweet);
            this.twitterEventStore.save(json);
          }
        }
      }
    }
  }
}

const feeder = buildInstance(FeederImpl);
feeder.start().catch(defaultEnv.debugFailure('feeder.start()'));
