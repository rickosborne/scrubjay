import {MysqlClient} from '../MysqlClient';
import {Channel} from './Channel';
import {TwitterUser} from '../twitter/TwitterUser';
import {FeedChannel, FeedStore} from './FeedStore';
import {buildFromObject} from '../FromObject';
import {SlackId} from './RTEvent';

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

@FeedStore.provider
class FeedStoreImpl extends MysqlClient implements FeedStore {
  public get channels(): Promise<FeedChannel[]> {
    return this.findObjects(FeedChannelImpl, `
      SELECT channel_id, channel_name
      FROM slack_feed
      ORDER BY channel_name
    `);
  }

  public channelsFor(user: TwitterUser): Promise<FeedChannel[]> {
    return this.findObjects(FeedChannelImpl, `
      SELECT sf.channel_id, sf.channel_name
      FROM slack_feed_twitter AS sft
             INNER JOIN slack_feed AS sf ON (sft.slack_channel_id = sf.channel_id)
      WHERE (sft.twitter_username = ?)
    `, [user.name]);
  }

  public createFeed(channel: Channel): Promise<FeedChannel | null> {
    return new Promise((resolve, reject) => {
      this
        .query<void>(`
          INSERT IGNORE INTO slack_feed (channel_id, channel_name)
          VALUES (?, ?)
        `, [channel.id, channel.name])
        .onResults(() => {
          resolve(new FeedChannelImpl(channel.id, channel.name));
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
}
