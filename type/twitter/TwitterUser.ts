import {buildFromObject} from '../FromObject';
import {Identity, identityStore} from '../Identity';
import {tweetStore} from './TweetStore';
import {MysqlClient} from '../MysqlClient';

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

  get identity(): Promise<Identity | null> {
    if (this.identId != null) {
      return identityStore.findById(this.identId);
    } else if (this.name != null) {
      return identityStore.findByName(this.name);
    }
    return Promise.resolve(null);
  }

  ifFollowed(callback: (user: TwitterUser) => void, otherwise?: () => void) {
    tweetStore.findObject(TwitterUser, `
      SELECT id, username, location, url, description, ident_id, active
      FROM twitter_follow
      WHERE (username = ?)
    `, [this.name])
      .then(user => {
        if (user != null) {
          callback(user);
        } else if (otherwise != null) {
          otherwise();
        }
      });
  }

  merge(): Promise<TwitterUser | null> {
    return tweetStore.findObject(TwitterUser, `
      SELECT id, username, location, url, description, ident_id, active
      FROM twitter_follow
      WHERE (username = ?)
    `, [this.name]).then(found => {
      if (found == null) {
        return null;
      }
      const changedFields = [];
      const changedValues = [];
      for (const fieldName of ['fullName', 'name', 'location', 'url', 'description']) {
        const updatedValue = this[fieldName];
        if (('' + updatedValue) !== ('' + found[fieldName])) {
          changedFields.push(fieldName);
          changedValues.push(updatedValue);
        }
      }
      if (changedFields.length > 0) {
        return new Promise<TwitterUser>((resolve, reject) => {
          const values = changedValues.concat(found.name);
          tweetStore.query(`
            UPDATE twitter_follow
            SET ${changedFields.map(f => `${f} = ?`).join(',')}
            WHERE username = ?
          `, values)
            .onResults(() => resolve(found))
            .onError(err => reject(err));
        });
      } else {
        return found;
      }
    });
  }
}

export class TwitterUserStore extends MysqlClient {
  findOneByName(username: string): Promise<TwitterUser | null> {
    return this.findOne(TwitterUser, 'username', username);
  }

  selectOne(fieldName: string): string {
    return `
      SELECT id, username, location, url, description, ident_id, active
      FROM twitter_follow
      WHERE (${fieldName} = ?)
    `;
  }
}

export const twitterUserStore = new TwitterUserStore();
