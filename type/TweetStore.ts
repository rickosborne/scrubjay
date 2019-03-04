import {Tweet, TwitterUser} from './TwitterClient';
import {MysqlClient} from './MysqlClient';
import {Identity} from './Identity';

export class TweetStore extends MysqlClient {
  constructor() {
    super();
  }

  follows(active: boolean = true): Promise<TwitterUser[]> {
    return this.findObjects(TwitterUser, `
      SELECT f.id, f.username, f.ident_id
      FROM twitter_follow AS f
      WHERE (active = ?)
      ORDER BY f.username
    `, [active]);
  }

  recentForIdentity(ident: Identity, count: number): Promise<Tweet[]> {
    return this.findObjects(Tweet, `
      SELECT t.id, t.username, t.created, t.txt, t.html
      FROM twitter_follow AS f
             INNER JOIN tweet AS t ON (t.username = f.username)
      WHERE (f.ident_id = ?)
      ORDER BY t.created DESC
      LIMIT ?
    `, [ident.id, count]);
  }

  selectOne(fieldName: string): string {
    return `
      SELECT id, username, created, txt, html
      FROM tweet
    `;
  }

  public store(tweet: Tweet) {
    this.query(`
      INSERT IGNORE INTO tweet (id, username, created, txt, html)
      VALUES (?, ?, ?, ?, ?)
      ;
    `, [
      tweet.id,
      tweet.user.name,
      tweet.created,
      tweet.text,
      tweet.html
    ]);
  }
}

export const tweetStore = new TweetStore();
