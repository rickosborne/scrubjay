import {MysqlClient} from '../../MysqlClient';
import {TwitterUser} from '../TwitterUser';
import {TwitterUserStore} from './TwitterUserStore';

@TwitterUserStore.provider
export class TwitterUserStoreImpl extends MysqlClient implements TwitterUserStore {

  public findOneByName(username: string): Promise<TwitterUser | null> {
    return this.findOne(TwitterUser, 'username', username);
  }

  public async merge(user: TwitterUser): Promise<TwitterUser> {
    const rows = await this.query<[string]>(`
      SELECT ident_id
      FROM twitter_follow
      WHERE (username = ?)
    `, [user.name])
      .fetch<{ ident_id: number }[]>();
    if (rows == null || rows.length === 0) {
      const slug = (user.fullName || user.name)
        .toLowerCase()
        .replace(/'/g, '')
        .replace(/[^a-z0-9]+/g, '-');
      const insertResults = await this
        .query<[string, string]>(`
          INSERT INTO ident (name, slug)
          VALUES (?, ?)
        `, [user.fullName, slug])
        .execute();
      await this.query(`
        INSERT INTO twitter_follow (id, username, location, url, description, ident_id, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [user.id, user.name, user.location, user.url, user.description, insertResults.insertId])
        .execute();
    } else {
      await this.query(`
        UPDATE twitter_follow
        SET location = COALESCE(?, location), url = COALESCE(?, url), description = COALESCE(?, description)
        WHERE (username = ?)
      `, [user.location, user.url, user.description, user.name])
        .execute();
    }
    return this.findOneByName(user.name);
  }

  protected selectOne(fieldName: string): string {
    return `
      SELECT id, username, location, url, description, ident_id, active
      FROM twitter_follow
      WHERE (${fieldName} = ?)
    `;
  }
}
