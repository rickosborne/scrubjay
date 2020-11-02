import {MysqlClient} from '../MysqlClient';
import {Channel} from './Channel';
import {TwitterUser} from '../twitter/TwitterUser';
import {ChannelAndFollowSummary, FeedChannel, FeedDelivery, FeedStore} from './FeedStore';
import {buildFromObject} from '../FromObject';
import {SlackId} from './RTEvent';

export interface ChannelAndFollowRow {
  channel_id: string;
  channel_name: string;
  twitter_username: string;
}

class FeedChannelImpl implements FeedChannel {
  public static fromObject(object: {}): FeedChannelImpl {
    return buildFromObject(FeedChannelImpl, object)
      .string(['channel_id', 'channelId'])
      .string(['channel_name', 'channelName'])
      .orThrow(message => new Error(`Could not reify FeedChannel: ${message}`));
  }

  constructor(
    public readonly id: SlackId,
    public readonly name: string
  ) {
  }
}

class FeedDeliveryImpl implements FeedDelivery {
  public static fromObject(object: {}): FeedDeliveryImpl {
    return buildFromObject(FeedDeliveryImpl, object)
      .string(['channel_id', 'channelId'])
      .string(['tweet_id', 'tweetId'])
      .date(['delivery_dt', 'deliveryDate'])
      .string('ts', false)
      .orThrow(message => new Error(`Could not reify FeedDelivery: ${message}`));
  }

  constructor(
    public readonly channelId: SlackId,
    public readonly tweetId: string,
    public readonly deliveryDate: number,
    public readonly ts: string | undefined,
  ) {
  }
}

@FeedStore.implementation
class FeedStoreImpl extends MysqlClient implements FeedStore {
  public get channels(): Promise<FeedChannel[]> {
    return this.findObjects(FeedChannelImpl, `
        SELECT channel_id, channel_name
        FROM slack_feed
        ORDER BY channel_name
    `);
  }

  public channelsAndFollows(): Promise<ChannelAndFollowSummary[]> {
    return this
      .query<void>(`
          SELECT sf.channel_id, sf.channel_name, sft.twitter_username
          FROM slack_feed AS sf
                   INNER JOIN slack_feed_twitter AS sft ON (sft.slack_channel_id = sf.channel_id)
          ORDER BY sf.channel_name, sft.twitter_username
      `)
      .fetch<ChannelAndFollowRow>()
      .then((rows) => {
        if (rows == null || rows.length < 1) {
          return [];
        }
        const followsByChannelId: { [key: string]: { channelName: string; follows: string[]; } } = {};
        for (const row of rows) {
          if (!(row.channel_id in followsByChannelId)) {
            followsByChannelId[row.channel_id] = {
              channelName: row.channel_name,
              follows: []
            };
          }
          followsByChannelId[row.channel_id].follows.push(row.twitter_username);
        }
        return Object.keys(followsByChannelId).map(channelId => {
          return {
            channel: {
              id: channelId,
              name: followsByChannelId[channelId].channelName
            },
            followNames: followsByChannelId[channelId].follows
          };
        });
      });
  }

  public channelsFor(user: TwitterUser): Promise<FeedChannel[]> {
    return this.findObjects(FeedChannelImpl, `
        SELECT sf.channel_id, sf.channel_name
        FROM slack_feed_twitter AS sft
                 INNER JOIN slack_feed AS sf ON (sft.slack_channel_id = sf.channel_id)
        WHERE (sft.twitter_username = ?)
    `, [user.name]);
  }

  public createFeed(channel: Channel): Promise<FeedChannel> {
    return new Promise((resolve, reject) => {
      this
        .query<[string, string]>(`
            INSERT IGNORE INTO slack_feed (channel_id, channel_name)
            VALUES (?, ?)
        `, [channel.id, channel.name])
        .execute()
        .then(() => {
          resolve(new FeedChannelImpl(channel.id, channel.name));
        })
        .catch(reason => reject(reason));
    });
  }

  delivered(channel: Channel | FeedChannel, tweetId: string, ts: string | undefined): Promise<boolean> {
    return this
      .query<[string, string, string | undefined]>(`
          INSERT IGNORE INTO slack_feed_delivery (channel_id, tweet_id, ts, delivery_dt)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [channel.id, tweetId, ts])
      .execute()
      .then(() => true)
      ;
  }

  public deliveryFor(channel: Channel | FeedChannel, tweetId: string): Promise<FeedDelivery | null> {
    return this.findObject<FeedDelivery>(FeedDeliveryImpl, `
        SELECT channel_id, tweet_id, delivery_dt, ts
        FROM slack_feed_delivery
        WHERE (channel_id = ?) AND (tweet_id = ?)
    `, [channel.id, tweetId]);
  }

  public follow(channel: Channel, user: TwitterUser): Promise<boolean> {
    if (user == null || user.name == null) {
      return Promise.reject(new Error('User has no name'));
    }
    return this
      .query<[string, string]>(`
          INSERT IGNORE INTO slack_feed_twitter (slack_channel_id, twitter_username)
          VALUES (?, ?)
      `, [channel.id, user.name])
      .execute()
      .then(() => true)
      ;
  }

  public followsFor(channel: FeedChannel | Channel): Promise<TwitterUser[]> {
    return this.findObjects<TwitterUser>(TwitterUser, `
        SELECT f.id, f.username, f.location, f.url, f.description, f.active
        FROM slack_feed_twitter AS sft
                 INNER JOIN twitter_follow AS f ON (sft.twitter_username = f.username) AND (f.active = 1)
        WHERE (sft.slack_channel_id = ?)
    `, [channel.id]);
  }
}
