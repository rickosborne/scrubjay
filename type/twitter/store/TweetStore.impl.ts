import {Tweet} from '../Tweet';
import {MysqlClient} from '../../MysqlClient';
import {Identity} from '../../Identity';
import {TwitterUser} from '../TwitterUser';
import {TweetStore} from './TweetStore';

@TweetStore.implementation
class TweetStoreImpl extends MysqlClient implements TweetStore {
  constructor() {
    super();
  }

  public async anyUndelivered(id: string, author: string = ''): Promise<boolean> {
    return this.query(`
        SELECT COUNT(*) AS missing
        FROM slack_feed_twitter AS sft
            LEFT JOIN slack_feed_delivery AS sfd ON (sft.slack_channel_id = sfd.channel_id) AND (sfd.tweet_id = ?)
        WHERE (sft.twitter_username = ?) AND (sfd.delivery_dt IS NULL)
    `, [id, author])
      .fetch<number>((rows) => rows.map((row) => row.missing))
      .then(missing => {
        return Array.isArray(missing) && missing.length === 1 ? missing[0] > 0 : false;
      })
      .then(missing => {
        if (this.env != null) {
          this.env.debug(() => `TweetStoreImpl.anyUndelivered('${id}', '${author}') => ${JSON.stringify(missing)}'`);
        }
        return missing;
      });
  }

  public follows(active: boolean = true): Promise<TwitterUser[]> {
    return this.findObjects(TwitterUser, `
        SELECT f.id, f.username, f.ident_id FROM twitter_follow AS f WHERE (active = ?) ORDER BY f.username
    `, [active]);
  }

  public async notExist(statusIds: string[]): Promise<string[]> {
    if (statusIds == null || statusIds.length < 1) {
      return [];
    }
    const existing = await this.query(`
      SELECT id
      FROM tweet
      WHERE id IN (${statusIds.map(() => '?').join(',')})
    `, statusIds)
      .fetch<string>((rows) => rows.map((row) => row.id));
    return statusIds.filter(id => existing.indexOf(id) < 0);
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
        SELECT id, username, created, txt, html FROM tweet
    `;
  }

  public store(tweet: Tweet): Promise<boolean> {
    return this
      .query(`
          INSERT IGNORE INTO tweet (id, username, created, txt, html) VALUES (?, ?, ?, ?, ?)
          ;
      `, [
        tweet.id,
        tweet.user.name,
        tweet.created,
        tweet.text,
        null,
      ])
      .execute()
      .then(insertResults => insertResults != null && (insertResults.affectedRows > 0 || insertResults.changedRows > 0));
  }
}
