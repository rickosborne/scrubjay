import {MysqlClient} from './MysqlClient';

export class TwitterEventStore extends MysqlClient {
  save(event: {} = null) {
    const username = event != null && event['user'] != null ? event['user']['screen_name'] : null;
    if (event != null) {
      this.query(`
        INSERT INTO twitter_event (username, data)
        VALUES (?, ?)
      `, [username, JSON.stringify(event)]);
    }
  }
}

export const twitterEventStore = new TwitterEventStore();
