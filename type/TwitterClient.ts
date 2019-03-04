import {Jsonable} from './ToJson';
import {buildFromObject} from './FromObject';
import * as Twitter from 'twitter';
import {config} from './Config';
import EventEmitter = NodeJS.EventEmitter;
import env from '../lib/env';
import {Identity, identityStore} from './Identity';
import {twitterEventStore} from './TwitterEventStore';
import {tweetStore} from './TweetStore';
import * as ejs from 'ejs';

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
    return entityMap[s];
  });
}

const renderTweetHtml = ejs.compile(`
<dl>
<dt>
<% if (tweet.user.url) { %>
<a href="<%= tweet.user.url %>"><%= tweet.user.name %></a>
<% } else { %>
<%= tweet.user.name %>
<% } %> (<a href="https://twitter.com/<%= tweet.user.name %>"><%= tweet.user.name %></a>)
</dt>
<dd>
<%- tweet.textAsHtml %>
</dd>
</dl>
`);

export class TwitterUser {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TwitterUser {
    return buildFromObject(TwitterUser, object)
      .scalar('id', null, false)
      .string('name', false)
      .string(['screen_name', 'username'], false)
      .string('location', false)
      .string('url', false)
      .string('description', false)
      .num('ident_id', false)
      .bool('active', false)
      .orNull();
  }

  constructor(
    public readonly id?: string | number,
    public readonly fullName?: string,
    public readonly name?: string,
    public readonly location?: string,
    public readonly url?: string,
    public readonly description?: string,
    public readonly identId?: number,
    public readonly active?: boolean,
  ) {
  }

  get identity(): Promise<Identity | null> {
    if (this.identId != null) {
      return identityStore.findById(this.identId);
    } else if (this.name != null) {
      return identityStore.findByName(this.name);
    }
    return Promise.resolve(null);
  }

  merge(): Promise<TwitterUser | null> {
    return tweetStore.findObject(TwitterUser, `
      SELECT id, username, location, url, description, ident_id, active
      FROM twitter_follow
      WHERE (username = ?)
    `, [this.name]).then(found => {
      if (found == null) {
        return null;
      }
      const changedFields = [];
      const changedValues = [];
      for (const fieldName of ['fullName', 'name', 'location', 'url', 'description']) {
        const updatedValue = this[fieldName];
        if (('' + updatedValue) !== ('' + found[fieldName])) {
          changedFields.push(fieldName);
          changedValues.push(updatedValue);
        }
      }
      if (changedFields.length > 0) {
        return new Promise<TwitterUser>((resolve, reject) => {
          const values = changedValues.concat(found.name);
          tweetStore.query(`
            UPDATE twitter_follow
            SET ${changedFields.map(f => `${f} = ?`).join(',')}
            WHERE username = ?
          `, values)
            .onResults(() => resolve(found))
            .onError(err => reject(err));
        });
      } else {
        return found;
      }
    });
  }
}

export class ExtendedUrl {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): ExtendedUrl {
    return buildFromObject(ExtendedUrl, object)
      .string('url')
      .string('display_url')
      .string('expanded_url')
      .orNull();
  }

  constructor(
    public readonly url: string,
    public readonly display: string,
    public readonly expanded: string,
  ) {
  }
}

export class ExtendedEntities {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): ExtendedEntities {
    return buildFromObject(ExtendedEntities, object)
      .list('urls', ExtendedUrl, false)
      .orNull();
  }

  constructor(
    public readonly urls: ExtendedUrl[]
  ) {
  }
}

export class ExtendedTweet {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): ExtendedTweet {
    return buildFromObject(ExtendedTweet, object)
      .string('full_text')
      .obj('entities', ExtendedEntities)
      .orNull();
  }

  constructor(
    public readonly text: string,
    public readonly entities: ExtendedEntities,
  ) {
  }
}

export class Tweet {

  constructor(
    text: string,
    public readonly user: TwitterUser,
    public readonly id: string,
    public readonly created?: Date,
    public readonly extended?: ExtendedTweet
  ) {
    this._text = (extended != null && extended.text != null) ? extended.text : text;
  }

  get html() {
    if (this._html == null) {
      this._html = renderTweetHtml({
        tweet: this,
      });
    }
    return this._html;
  }

  // noinspection JSUnusedGlobalSymbols
  get textAsHtml() {
    if (this._textAsHtml == null) {
      let html = escapeHtml(this.text).replace(/\x0d?\x0a/g, '<br>');
      if (this.extended != null && this.extended.entities != null) {
        for (const url of (this.extended.entities.urls || [])) {
          const link = '<' + 'a href="' + escapeHtml(url.expanded) + '">' + escapeHtml(url.display) + '</a>';
          html = html.split(escapeHtml(url.url)).join(link);
        }
      }
      this._textAsHtml = html;
    }
    return this._textAsHtml;
  }

  get text() {
    return this._text;
  }

  private readonly _text: string;

  private _html: string;

  private _textAsHtml: string;

  static fromObject(object: {}): Tweet {
    return buildFromObject(Tweet, object)
      .string('text', true)
      .obj('user', TwitterUser, true)
      .string('id_str', true)
      .date('created_at', false)
      .obj('extended_tweet', ExtendedTweet, false)
      .orNull();
  }
}

type TweetCallback = (tweet: Tweet) => void;

export class TwitterClient extends Jsonable {

  constructor() {
    super();
    this.twitter = new Twitter(config.twitter.credentials);
  }

  private stream: EventEmitter;
  private readonly tweetCallbacks: TweetCallback[] = [];
  private twitter: Twitter;
  public readonly users: string[] = [];

  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TwitterClient {
    return buildFromObject(TwitterClient, object)
      .orThrow(() => new Error(`Invalid twitter config`));
  }

  public addUsers(...users: string[]): this {
    env.debug(() => `Following: ${users.join(', ')}`);
    this.users.push(...users);
    return this;
  }

  public connect(backoff?: number) {
    if (this.stream != null && this.stream['destroy']) {
      // @ts-ignore
      this.stream.destroy();
    }
    let wait = backoff || 0;
    setTimeout(() => {
      env.debug('Twitter: connect');
      this.twitter.stream('statuses/filter', {
        follow: this.users.join(',')
      }, stream => {
        this.stream = stream;
        stream.on('data', maybeTweet => {
          let logEvent = false;
          const tweet = Tweet.fromObject(maybeTweet);
          if (tweet != null) {
            wait = 0;
            tweet.user.merge().then(user => {
              if (user != null) {
                logEvent = true;
                tweetStore.store(tweet);
                for (const callback of this.tweetCallbacks) {
                  callback(tweet);
                }
              }
            });
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
