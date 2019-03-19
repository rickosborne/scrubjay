import {TweetJSON, TwitterEventStore} from './store/TwitterEventStore';
import {TweetStore} from './store/TweetStore';
import * as Twitter from 'twitter';
import {TwitterUser} from './TwitterUser';
import env from '../../lib/env';
import {Tweet} from './Tweet';
import {TweetCallback, TwitterClient} from './TwitterClient';
import {EventEmitter} from 'events';
import {TwitterConfig} from '../config/TwitterConfig';

@TwitterClient.provider
class TwitterClientImpl implements TwitterClient {

  private readonly _stream: boolean;
  private stream: EventEmitter;
  private readonly tweetCallbacks: TweetCallback[] = [];
  private twitter: Twitter | undefined;
  public readonly userIds: string[] = [];
  public readonly userNames: string[] = [];

  constructor(
    @TwitterConfig.required config: TwitterConfig,
    @TwitterEventStore.required private readonly twitterEventStore: TwitterEventStore,
    @TweetStore.required private readonly tweetStore: TweetStore,
  ) {
    this.twitter = new Twitter(config.credentials);
    this._stream = config.connectStream;
  }

  public addUsers(...users: TwitterUser[]): this {
    this.userNames.push(...users.map(user => user.name));
    env.debug(() => `Following: ${this.userNames.join(', ')}`);
    this.userIds.push(...users.map(user => '' + user.id));
    return this;
  }

  public connect(backoff?: number) {
    // @ts-ignore
    if (this.stream != null && (typeof this.stream['destroy'] === 'function')) {
      // @ts-ignore
      this.stream.destroy();
    }
    let wait = backoff || 0;
    if (backoff > 0) {
      env.debug(() => `Twitter client backoff: ${backoff}`);
    }
    if (this._stream) {
      setTimeout(() => {
        env.debug('Twitter: connect');
        this.twitter.stream('statuses/filter', {
          follow: this.userIds.join(',')
        }, stream => {
          this.stream = stream;
          stream.on('data', maybeTweet => {
            let logEvent = false;
            const tweet = Tweet.fromObject(maybeTweet);
            if (tweet != null) {
              env.debug(() => `@${tweet.user.name}: ${tweet.text.replace(/\s+/g, ' ')}`);
              wait = 0;
              if (this.userNames.indexOf(tweet.user.name) >= 0) {
                logEvent = true;
                this.tweetStore.store(tweet);
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
          });
          stream.on('error', err => {
            env.debug('Twitter stream error', err);
            this.connect(wait === 0 ? 2000 : Math.min(30000, wait * 2));  // reconnect
          });
        });
      }, wait);
    } else {
      env.debug(`Skipping Twitter stream connect`);
    }
  }

  fetchUser(name: string): Promise<TwitterUser> {
    return this.twitter.get('users/show', {screen_name: name})
      .then(response => TwitterUser.fromObject(response));
  }

  public onTweet(callback: TweetCallback) {
    this.tweetCallbacks.push(callback);
  }

  public recent(user: TwitterUser, count: number = 20): Promise<[Tweet, TweetJSON][]> {
    return this.twitter
      .get('statuses/user_timeline', {
        screen_name: user.name,
        count: count
      })
      .then(response => Array.isArray(response) ? response.map(item => {
        // noinspection UnnecessaryLocalVariableJS
        const pair: [Tweet, TweetJSON] = [Tweet.fromObject(item), <TweetJSON>item];
        return pair;
      }) : []);
  }
}
