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
import './type/slack/SlackClient.impl';
import './type/slack/SlackTweetFormatter.impl';
import './type/slack/FeedStore.impl';
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
  ) {
    env.debug(() => `Song`);
    this.tweetQueue = sqsAdapter.queueForType<TweetJSON>(TweetJSON);
  }

  protected onTweet(tweet: TweetJSON, followEmoji?: string | null): Promise<OnAvailableResult> {
    const tweetImpl = Tweet.fromObject(tweet);
    if (tweetImpl == null) {
      this.env.debug(() => `SongImpl.onTweet: Failed to reify Tweet: ${JSON.stringify(tweet)}`);
      return Promise.resolve(OnAvailableResult.ERROR);
    }
    const postables = this.tweetFormatter.messagesFromTweet(tweetImpl, {followEmoji});
    if (!Array.isArray(postables)) {
      this.env.debug(() => `SongImpl.onTweet: Failed to format tweet: ${JSON.stringify(tweetImpl)}`);
      return Promise.resolve(OnAvailableResult.ERROR);
    }
    const tweetId = tweetImpl.id;
    return this.feedStore.channelsFor(tweetImpl.user).then(channels => {
      return Promise.all(channels.map(channel => {
        return this.feedStore.deliveryFor(channel, tweetId).then(maybeDelivery => {
          if (maybeDelivery != null) {
            return OnAvailableResult.HANDLED;
          }
          return this.slackClient.send(...postables.map(p => p.with(channel.id))).then(() => {
            return this.feedStore.delivered(channel, tweetId).then(() => {
              this.env.debug(() => `SongImpl.onTweet delivered ${tweetImpl.id}`);
              return OnAvailableResult.HANDLED;
            });
          });
        });
      }))
        .then(() => OnAvailableResult.HANDLED)
        .catch((err) => {
          this.env.debug('SongImpl.onTweet', err);
          return OnAvailableResult.ERROR;
        });
    });
  }

  public async start(): Promise<void> {
    const queue = await this.tweetQueue;
    const followEmoji = await this.configStore.followEmoji;
    queue.addListener(
      (obj) => obj,
      (tweet) => this.onTweet(tweet, followEmoji),
    );
  }
}

const song = buildInstance(SongImpl);
song.start().catch(defaultEnv.debugFailure('song.start()', () => process.exit(1)));
