import {MysqlClient} from '../../MysqlClient';
import {Tweet} from '../Tweet';
import {TweetJSON, TwitterEventStore} from './TwitterEventStore';
import env from '../../../lib/env';

@TwitterEventStore.implementation
class TwitterEventStoreImpl extends MysqlClient implements TwitterEventStore {
  findById(statusId: string): Promise<Tweet | null> {
    return this.findOneOrNull('(JSON_EXTRACT(`data`, \'$.id\') = ?) OR (JSON_EXTRACT(`data`, \'$.id_str\') = ?)',
      parseInt(statusId, 10), statusId);
  }

  protected findOneOrNull(where: string, ...params: any[]): Promise<Tweet | null> {
    return this.query<any[]>(`
      SELECT data
      FROM twitter_event
      WHERE ${where}
      ORDER BY created DESC
    `, params)
      .fetch<{data: string}>()
      .then(rows => rows == null || rows.length < 1 ? null : Tweet.fromObject(rows[0].data));
  }

  latest(retweetsAcceptable: boolean = false, repliesAcceptable: boolean = false): Promise<Tweet | undefined> {
    const conditions: string[] = [];
    if (!repliesAcceptable) {
      conditions.push('JSON_TYPE(JSON_EXTRACT(data, \'$.in_reply_to_status_id_str\')) = \'NULL\'');
    }
    if (!retweetsAcceptable) {
      conditions.push('JSON_TYPE(JSON_EXTRACT(data, \'$.retweeted_status\')) IS NULL');
    }
    if (conditions.length === 0) {
      conditions.push('(1 = 1)');
    }
    return this.findOneOrNull(conditions.join(' AND ')).then(one => one == null ? undefined : one);
  }

  latestFor(username: string): Promise<Tweet | undefined> {
    return this.findOneOrNull(`
      (username = ?)
      AND JSON_TYPE(JSON_EXTRACT(data, '$.in_reply_to_status_id_str')) = 'NULL'
      AND JSON_TYPE(JSON_EXTRACT(data, '$.retweeted_status')) IS NULL
    `, username.replace(/^@/, ''))
      .then(one => one == null ? undefined : one);
  }

  public async save(event: TweetJSON): Promise<void> {
    const username = event != null && event['user'] != null ? event['user']['screen_name'] : null;
    if (event != null) {
      const where: string[] = [];
      const params: any[] = [];
      if (event.id_str != null) {
        where.push(`(JSON_EXTRACT(data, '$.id_str') = ?)`);
        params.push(String(event.id_str));
      }
      if (event.id != null) {
        where.push(`(JSON_EXTRACT(data, '$.id') = ?)`);
        params.push(parseInt(String(event.id), 10));
      }
      if (where.length === 0) {
        env.debug(() => `TwitterEventStore.save cannot save tweet without ID: ${env.readable(event)}`);
        return;
      }
      await this
        .query(`
          SELECT id
          FROM twitter_event
          WHERE ${where.join(' OR ')}
        `, params)
        .fetch<{id: string}>()
        .then((rows) => {
          if (rows == null || rows.length === 0) {
            this.query(`
              INSERT IGNORE INTO twitter_event (username, data)
              VALUES (?, ?)
            `, [username, JSON.stringify(event)])
              .execute()
              .catch((reason) => {
                env.debug(() => `Failed to add event: ${reason}`);
              });
          } else {
            env.debug(() => `Already have a version of tweet: ${rows[0].id}`);
          }
        });
    }
  }
}
