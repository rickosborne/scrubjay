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
import './type/slack/extractor/MediaExtractor';
import './type/aphelocoma/MediaTranscoder.impl';
import './type/slack/SlackClient.impl';
import './type/slack/SlackTweetFormatter.impl';
import './type/slack/FeedStore.impl';
import {LogSwitch} from './type/Logger';
import {Tweet} from './type/twitter/Tweet';
import {OnAvailableResult, SQSAdapter, TypedQueue} from './type/aws/SQS';
import {buildInstance} from 'inclined-plane';
import {SlackClient} from './type/slack/SlackClient';
import {FeedStore} from './type/slack/FeedStore';
import {SlackTweetFormatter} from './type/slack/SlackTweetFormatter';
import {ScrubjayConfigStore} from './type/config/ScrubjayConfigStore';
import {TweetJSON} from './type/twitter/store/TwitterEventStore';

class SongImpl {
  private readonly tweetQueue: Promise<TypedQueue<TweetJSON>>;

  constructor(
    @SQSAdapter.required sqsAdapter: SQSAdapter,
    @Env.required private readonly env: Env,
    @SlackClient.required private readonly slackClient: SlackClient,
    @FeedStore.required private readonly feedStore: FeedStore,
    @SlackTweetFormatter.required private readonly tweetFormatter: SlackTweetFormatter,
    @ScrubjayConfigStore.required private readonly configStore: ScrubjayConfigStore,
    @LogSwitch.required private readonly logSwitch: LogSwitch,
  ) {
    this.logSwitch.info(`Song`);
    this.tweetQueue = sqsAdapter.queueForType<TweetJSON>(TweetJSON);
  }

  protected async onTweet(tweet: TweetJSON, followEmoji?: string | null): Promise<OnAvailableResult> {
    if (tweet == null) {
      return Promise.resolve(OnAvailableResult.ERROR);
    }
    const tweetImpl = Tweet.fromObject(tweet);
    if (tweetImpl == null) {
      this.logSwitch.error(`SongImpl.onTweet: Failed to reify Tweet: ${JSON.stringify(tweet)}`);
      return Promise.resolve(OnAvailableResult.ERROR);
    }
    const postables = await this.tweetFormatter.messagesFromTweet(tweetImpl, {followEmoji});
    if (!Array.isArray(postables)) {
      this.logSwitch.error(`SongImpl.onTweet: Failed to format tweet: ${JSON.stringify(tweetImpl)}`);
      return Promise.resolve(OnAvailableResult.ERROR);
    }
    const tweetId = tweetImpl.id;
    return this.feedStore.channelsFor(tweetImpl.user).then(channels => {
      return Promise.all(channels.map(channel => {
        return this.feedStore.deliveryFor(channel, tweetId).then(maybeDelivery => {
          if (maybeDelivery != null) {
            return OnAvailableResult.HANDLED;
          }
          return this.slackClient
            .sendWithResult(result => typeof result.ts === 'string' ? result.ts : undefined,
              ...postables.map(p => p.with(channel.id)))
            .then(maybeTs => {
              return this.feedStore
                .delivered(channel, tweetId, maybeTs)
                .then(() => {
                  this.logSwitch.info(`SongImpl.onTweet delivered ${tweetImpl.id}`);
                  return OnAvailableResult.HANDLED;
                });
            });
        });
      }))
        .then(() => OnAvailableResult.HANDLED)
        .catch((err) => {
          this.logSwitch.error('SongImpl.onTweet', err);
          return OnAvailableResult.ERROR;
        });
    });
  }

  public async start(): Promise<void> {
    try {
      this.logSwitch.info(`Song starting up`);
      const queue = await this.tweetQueue;
      const followEmoji = await this.configStore.followEmoji;
      queue.addListener(
        (obj) => obj,
        (tweet) => this.onTweet(tweet, followEmoji),
      );
    } catch (e) {
      this.logSwitch.error(`Song error`, e);
      throw e;
    }
  }
}

const song = buildInstance(SongImpl);
song.start().catch(defaultEnv.debugFailure('song.start()', () => process.exit(1)));
