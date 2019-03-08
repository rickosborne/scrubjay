import {buildFromObject} from '../FromObject';
import * as Twitter from 'twitter';
import {config} from '../Config';
import env from '../../lib/env';
import {twitterEventStore} from './TwitterEventStore';
import {tweetStore} from './TweetStore';
import {Tweet} from './Tweet';
import EventEmitter = NodeJS.EventEmitter;
import {TwitterUser} from './TwitterUser';

type TweetCallback = (tweet: Tweet) => void;

export class TwitterClient {

  constructor() {
    this.twitter = new Twitter(config.twitter.credentials);
  }

  private stream: EventEmitter;
  private readonly tweetCallbacks: TweetCallback[] = [];
  private twitter: Twitter;
  public readonly userNames: string[] = [];
  public readonly userIds: string[] = [];

  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TwitterClient {
    return buildFromObject(TwitterClient, object)
      .orThrow(() => new Error(`Invalid twitter config`));
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
              tweetStore.store(tweet);
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
            twitterEventStore.save(maybeTweet);
          }
        });
        stream.on('error', err => {
          env.debug('Twitter stream error', err);
          this.connect(wait === 0 ? 2000 : Math.min(30000, wait * 2));  // reconnect
        });
      });
    }, wait);
  }

  public onTweet(callback: TweetCallback) {
    this.tweetCallbacks.push(callback);
  }
}

export const twitterClient = new TwitterClient();
