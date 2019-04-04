import {Tweet} from '../Tweet';
import {MysqlClient} from '../../MysqlClient';
import {Identity} from '../../Identity';
import {TwitterUser} from '../TwitterUser';
import {TweetStore} from './TweetStore';

@TweetStore.provider
class TweetStoreImpl extends MysqlClient implements TweetStore {
  constructor() {
    super();
  }

  public follows(active: boolean = true): Promise<TwitterUser[]> {
    return this.findObjects(TwitterUser, `
      SELECT f.id, f.username, f.ident_id
      FROM twitter_follow AS f
      WHERE (active = ?)
      ORDER BY f.username
    `, [active]);
  }

  public recentForIdentity(ident: Identity, count: number): Promise<Tweet[]> {
    return this.findObjects(Tweet, `
      SELECT t.id, t.username, t.created, t.txt, t.html
      FROM twitter_follow AS f
             INNER JOIN tweet AS t ON (t.username = f.username)
      WHERE (f.ident_id = ?)
      ORDER BY t.created DESC
      LIMIT ?
    `, [ident.id, count]);
  }

  protected selectOne(fieldName: string): string {
    return `
      SELECT id, username, created, txt, html
      FROM tweet
    `;
  }

  public store(tweet: Tweet): Promise<boolean> {
    return this
      .query<[string, string, Date, string, void]>(`
        INSERT IGNORE INTO tweet (id, username, created, txt, html)
        VALUES (?, ?, ?, ?, ?)
        ;
      `, [
        tweet.id,
        tweet.user.name,
        tweet.created,
        tweet.text,
        null,
      ])
      .execute()
      .then(insertResults => insertResults.affectedRows > 0 || insertResults.changedRows > 0);
  }
}
