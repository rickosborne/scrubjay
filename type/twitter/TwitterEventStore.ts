import {MysqlClient} from '../MysqlClient';
import {Tweet} from './Tweet';

export class TwitterEventStore extends MysqlClient {
  get latest(): Promise<Tweet> {
    return this.query<{data: object}[]>(`
      SELECT data
      FROM twitter_event
      WHERE JSON_TYPE(JSON_EXTRACT(data, '$.in_reply_to_status_id_str')) = 'NULL'
        AND JSON_TYPE(JSON_EXTRACT(data, '$.retweeted_status')) IS NULL
      ORDER BY id DESC
      LIMIT 1
    `).promise.then(rows => rows == null || rows.length < 1 ? null : Tweet.fromObject(rows[0].data));
  }

  static getInstance(): Promise<TwitterEventStore> {
    return Promise.resolve(new TwitterEventStore());
  }

  latestFor(username: string): Promise<Tweet> {
    return this.query<{data: object}[]>(`
      SELECT data
      FROM twitter_event
      WHERE (username = ?)
        AND JSON_TYPE(JSON_EXTRACT(data, '$.in_reply_to_status_id_str')) = 'NULL'
        AND JSON_TYPE(JSON_EXTRACT(data, '$.retweeted_status')) IS NULL
      ORDER BY id DESC
      LIMIT 1
    `, [username.replace(/^@/, '')]).promise.then(rows => {
      return rows == null || rows.length < 1 ? null : Tweet.fromObject(rows[0].data);
    });
  }

  save(event: {[key: string]: {[key: string]: string}} = null) {
    const username = event != null && event['user'] != null ? event['user']['screen_name'] : null;
    if (event != null) {
      this.query<void>(`
        INSERT INTO twitter_event (username, data)
        VALUES (?, ?)
      `, [username, JSON.stringify(event)]);
    }
  }
}