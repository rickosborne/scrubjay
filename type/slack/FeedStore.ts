import {MysqlClient} from '../MysqlClient';
import {buildFromObject} from '../FromObject';
import {SlackId} from './RTEvent';
import {TwitterUser} from '../twitter/TwitterUser';
import {Channel} from './Channel';

export class FeedChannel {
  public static fromObject(object: {}): FeedChannel {
    return buildFromObject(FeedChannel, object)
      .string(['channel_id', 'channelId'])
      .string(['channel_name', 'channelName'])
      .orThrow(message => new Error(`Could not reify FeedChannel: ${message}`));
  }

  public static linkFor(channel: Channel | FeedChannel): string {
    return `<#${channel.id}|${channel.name}>`;
  }

  constructor(
    public readonly id: SlackId,
    public readonly name: string
  ) {
  }

  public get link(): string {
    return `<#${this.id}|${this.name}>`;
  }
}

export class FeedStore extends MysqlClient {
  public get channels(): Promise<FeedChannel[]> {
    return this.findObjects(FeedChannel, `
      SELECT channel_id, channel_name
      FROM slack_feed
      ORDER BY channel_name
    `);
  }

  public static getInstance(): Promise<FeedStore> {
    return Promise.resolve(new FeedStore());
  }

  public createFeed(channel: Channel): Promise<FeedChannel | null> {
    return new Promise((resolve, reject) => {
      this
        .query<void>(`
          INSERT IGNORE INTO slack_feed (channel_id, channel_name)
          VALUES (?, ?)
        `, [channel.id, channel.name])
        .onResults(() => {
          resolve(new FeedChannel(channel.id, channel.name));
        })
        .onError(reason => reject(reason));
    });
  }

  public follow(channel: Channel, user: TwitterUser): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this
        .query<void>(`
          INSERT IGNORE INTO slack_feed_twitter (slack_channel_id, twitter_username)
          VALUES (?, ?)
        `, [channel.id, user.name])
        .onResults(() => {
          resolve(true);
        })
        .onError(reason => reject(reason));
    });
  }

  public followsFor(channel: FeedChannel | Channel): Promise<TwitterUser[]> {
    return this.findObjects(TwitterUser, `
      SELECT f.id, f.username, f.location, f.url, f.description, f.active
      FROM slack_feed_twitter AS sft
             INNER JOIN twitter_follow AS f ON (sft.twitter_username = f.username) AND (f.active = 1)
      WHERE (sft.slack_channel_id = ?)
    `, [channel.id]);
  }

  channelsFor(user: TwitterUser): Promise<FeedChannel[]> {
    return this.findObjects(FeedChannel, `
      SELECT sf.channel_id, sf.channel_name
      FROM slack_feed_twitter AS sft
        INNER JOIN slack_feed AS sf ON (sft.slack_channel_id = sf.channel_id)
      WHERE (sft.twitter_username = ?)
    `, [user.name]);
  }
}
