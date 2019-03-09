import {buildFromObject} from '../FromObject';
import {InsertResults, MysqlClient, Query} from '../MysqlClient';

export class TwitterUser {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TwitterUser {
    return buildFromObject(TwitterUser, object)
      .scalar('id', null, false)
      .string('name', false)
      .string(['screen_name', 'username'], false)
      .string('location', false)
      .string('url', false)
      .string('description', false)
      .num('ident_id', false)
      .bool('active', false)
      .string(['profile_image_url_https', 'profile_image_url'], false)
      .string('profile_banner_url', false)
      .string('profile_text_color', false)
      .string('profile_link_color', false)
      .string('profile_background_color', false)
      .string('profile_sidebar_fill_color', false)
      .string('profile_sidebar_border_color', false)
      .string(['profile_background_image_url_https', 'profile_background_image_url'], false)
      .orLog();
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly id?: string | number,
    public readonly fullName?: string,
    public readonly name?: string,
    public readonly location?: string,
    public readonly url?: string,
    public readonly description?: string,
    public readonly identId?: number,
    public readonly active?: boolean,
    public readonly profileImage?: string,
    public readonly profileBanner?: string,
    public readonly textColor?: string,
    public readonly linkColor?: string,
    public readonly backgroundColor?: string,
    public readonly sidebarFillColor?: string,
    public readonly sidebarBorderColor?: string,
    public readonly backgroundImage?: string,
  ) {
  }
}

export class TwitterUserStore extends MysqlClient {

  public static getInstance(): Promise<TwitterUserStore> {
    return Promise.resolve(new TwitterUserStore());
  }

  findOneByName(username: string): Promise<TwitterUser | null> {
    return this.findOne(TwitterUser, 'username', username);
  }

  merge(user: TwitterUser): Promise<TwitterUser> {
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

  selectOne(fieldName: string): string {
    return `
      SELECT id, username, location, url, description, ident_id, active
      FROM twitter_follow
      WHERE (${fieldName} = ?)
    `;
  }
}
