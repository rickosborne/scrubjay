import {EventEmitter} from 'events';
import * as Twitter from 'twitter';
import env from '../../lib/env';
import {TwitterConfig} from '../config/TwitterConfig';
import {LogSwitch} from '../Logger';
import {NotifyQueue} from '../NotifyQueue';
import {TweetStore} from './store/TweetStore';
import {TwitterEventStore} from './store/TwitterEventStore';
import {Tweet} from './Tweet';
import {TweetCallback, TwitterClient, TwitterClientState} from './TwitterClient';
import {TwitterUser} from './TwitterUser';

@TwitterClient.implementation
export class TwitterClientImpl implements TwitterClient {

  private _lastConnectedTime: Date | undefined;
  private _state: TwitterClientState = TwitterClientState.DISCONNECTED;
  private readonly _stream: boolean;
  private _tweetsSinceLastConnect = 0;
  private stream?: EventEmitter;
  private readonly tweetCallbacks: TweetCallback[] = [];
  private readonly twitter?: Twitter;
  public readonly userIds: string[] = [];
  public readonly userNames: string[] = [];

  constructor(
    @TwitterConfig.required config: TwitterConfig,
    @TwitterEventStore.required private readonly twitterEventStore: TwitterEventStore,
    @TweetStore.required private readonly tweetStore: TweetStore,
    @NotifyQueue.required private readonly notifyQueue: NotifyQueue,
    @LogSwitch.required private readonly logSwitch: LogSwitch,
  ) {
    this.twitter = new Twitter(config.credentials);
    this._stream = config.connectStream;
  }

  public get lastConnectedTime(): Date | undefined {
    return this._lastConnectedTime;
  }

  public get state(): TwitterClientState {
    return this._state;
  }

  public get tweetsSinceLastConnect(): number {
    return this._tweetsSinceLastConnect;
  }

  public addUsers(...users: TwitterUser[]): this {
    this.userNames.push(...users.map(user => user.name || '?'));
    env.debug(() => `Following: ${this.userNames.join(', ')}`);
    this.userIds.push(...users.map(user => '' + user.id));
    return this;
  }

  public connect(backoff?: number) {
    // @ts-ignore
    if (this.stream != null && (typeof this.stream['destroy'] === 'function')) {
      // @ts-ignore
      this.stream.destroy();
      this._state = TwitterClientState.DISCONNECTED;
    }
    let wait = backoff || 0;
    if ((backoff || 0) > 0) {
      const backoffMessage = `Twitter client backoff: ${backoff}`;
      env.debug(() => backoffMessage);
      this.notifyQueue.put(backoffMessage);
    }
    if (this._stream) {
      this._state = TwitterClientState.BACKOFF;
      setTimeout(() => {
        this._state = TwitterClientState.CONNECTING;
        if (this.twitter == null) {
          throw new Error(`No twitter client`);
        }
        const connectMessage = 'Twitter: connect';
        env.debug(connectMessage);
        this.notifyQueue.put(connectMessage);
        this.twitter.stream('statuses/filter', {
          follow: this.userIds.join(',')
        }, stream => {
          this._state = TwitterClientState.CONNECTED;
          this.stream = stream;
          this._tweetsSinceLastConnect = 0;
          this._lastConnectedTime = new Date();
          stream.on('data', maybeTweet => {
            try {
              let logEvent = false;
              const tweet = Tweet.fromObject(maybeTweet);
              if (tweet != null) {
                this._tweetsSinceLastConnect++;
                env.debug(() => `@${tweet.user.name}: ${tweet.text.replace(/\s+/g, ' ')}`);
                wait = 0;
                if (this.userNames.indexOf(tweet.user.name || '?') >= 0) {
                  logEvent = true;
                  this.tweetStore.store(tweet).catch(env.debugFailure('Unable to store tweet: '));
                  for (const callback of this.tweetCallbacks) {
                    callback(tweet);
                  }
                }
              } else {
                logEvent = true;
                env.debug(() => `Not a tweet: ${JSON.stringify(maybeTweet)}`);
              }
              if (logEvent) {
                env.debug(maybeTweet);
                this.twitterEventStore.save(maybeTweet);
              }
            } catch (e) {
              this.notifyQueue.put(`Twitter stream caught: ${e.message}`);
            }
          });
          stream.on('error', err => {
            env.debug('Twitter stream error', err);
            this.notifyQueue.put(`Twitter stream error: `, err);
            this.connect(wait === 0 ? 2000 : Math.min(30000, wait * 2));  // reconnect
          });
        });
      }, wait);
    } else {
      env.debug(`Skipping Twitter stream connect`);
    }
  }

  fetchTweet(id: string): Promise<Tweet | undefined> {
    if (this.twitter == null) {
      throw new Error(`No Twitter client to look up tweet \`${id}\`.`);
    }
    return this.twitter.get('statuses/show', {id})
      .then(response => {
        if (response == null) {
          return undefined;
        }
        try {
          return Tweet.fromObject(response);
        } catch (e) {
          this.logSwitch.error(`Could not fetch tweet ${id}: ${e.message}`, e);
        }
      });
  }

  fetchUser(name: string): Promise<TwitterUser> {
    if (this.twitter == null) {
      throw new Error(`No Twitter client to look up \`${name}\`.`);
    }
    return this.twitter.get('users/show', {screen_name: name})
      .then(response => TwitterUser.fromObject(response));
  }

  public onTweet(callback: TweetCallback) {
    this.tweetCallbacks.push(callback);
  }

  public recent(user: TwitterUser, count: number = 20): Promise<Tweet[]> {
    if (this.twitter == null) {
      throw new Error(`No Twitter client to fetch recent tweets.`);
    }
    return this.twitter
      .get('statuses/user_timeline', {
        screen_name: user.name,
        count: count
      })
      .then(response => Array.isArray(response) ? response.map(item => Tweet.fromObject(item)) : []);
  }
}
