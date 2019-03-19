import {MysqlClient} from '../MysqlClient';
import {Tweet} from './Tweet';
import {TwitterEventStore} from './TwitterEventStore';

@TwitterEventStore.provider
class TwitterEventStoreImpl extends MysqlClient implements TwitterEventStore {
  findById(statusId: string): Promise<Tweet | null> {
    return this.findOneOrNull('(JSON_EXTRACT(`data`, \'$.id\') = ?) OR (JSON_EXTRACT(`data`, \'$.id_str\') = ?)',
      parseInt(statusId, 10), statusId);
  }

  protected findOneOrNull(where: string, ...params: any[]): Promise<Tweet | null> {
    return this.query<{ data: object }[]>(`
      SELECT data
      FROM twitter_event
      WHERE ${where}
    `, params).promise.then(rows => rows == null || rows.length < 1 ? null : Tweet.fromObject(rows[0].data));
  }

  latest(retweetsAcceptable: boolean = false, repliesAcceptable: boolean = false): Promise<Tweet> {
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
    return this.findOneOrNull(conditions.join(' AND '));
  }

  latestFor(username: string): Promise<Tweet> {
    return this.findOneOrNull(`
      (username = ?)
      AND JSON_TYPE(JSON_EXTRACT(data, '$.in_reply_to_status_id_str')) = 'NULL'
      AND JSON_TYPE(JSON_EXTRACT(data, '$.retweeted_status')) IS NULL
    `, username.replace(/^@/, ''));
  }

  save(event: { [key: string]: { [key: string]: string } } = null) {
    const username = event != null && event['user'] != null ? event['user']['screen_name'] : null;
    if (event != null) {
      this.query<void>(`
        INSERT INTO twitter_event (username, data)
        VALUES (?, ?)
      `, [username, JSON.stringify(event)]);
    }
  }
}
