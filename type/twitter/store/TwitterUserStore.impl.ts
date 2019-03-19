import {InsertResults, MysqlClient, Query} from '../../MysqlClient';
import {TwitterUser} from '../TwitterUser';
import {TwitterUserStore} from './TwitterUserStore';

@TwitterUserStore.provider
export class TwitterUserStoreImpl extends MysqlClient implements TwitterUserStore {

  public findOneByName(username: string): Promise<TwitterUser | null> {
    return this.findOne(TwitterUser, 'username', username);
  }

  public merge(user: TwitterUser): Promise<TwitterUser> {
    return this.query<{ ident_id: number }[]>(`
      SELECT ident_id
      FROM twitter_follow
      WHERE (username = ?)
    `, [user.name]).promise
      .then(rows => {
        let modify: Query<unknown>;
        if (rows == null || rows.length === 0) {
          const slug = (user.fullName || user.name)
            .toLowerCase()
            .replace(/'/g, '')
            .replace(/[^a-z0-9]+/g, '-');
          modify = this
            .query<InsertResults>(`
              INSERT INTO ident (name, slug)
              VALUES (?, ?)
            `, [user.fullName, slug])
            .thenQuery<void>(`
              INSERT INTO twitter_follow (id, username, location, url, description, ident_id, active)
              VALUES (?, ?, ?, ?, ?, ?, 1)
            `, identInsert => [user.id, user.name, user.location, user.url, user.description, identInsert.insertId]);
        } else {
          modify = this.query<void>(`
            UPDATE twitter_follow
            SET location = COALESCE(?, location), url = COALESCE(?, url), description = COALESCE(?, description)
            WHERE (username = ?)
          `, [user.location, user.url, user.description, user.name]);
        }
        return modify.promise.then(() => this.findOneByName(user.name));
      });
  }

  protected selectOne(fieldName: string): string {
    return `
      SELECT id, username, location, url, description, ident_id, active
      FROM twitter_follow
      WHERE (${fieldName} = ?)
    `;
  }
}
