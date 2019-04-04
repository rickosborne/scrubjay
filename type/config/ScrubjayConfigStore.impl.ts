import {ScrubjayConfigStore} from './ScrubjayConfigStore';
import {MysqlClient} from '../MysqlClient';
import {FOLLOW_EMOJI_DEFAULT} from '../slack/SlackTweetFormatter';

@ScrubjayConfigStore.provider
export class ScrubjayConfigStoreImpl extends MysqlClient implements ScrubjayConfigStore {
  public get followEmoji(): Promise<string | null> {
    return this.valueForKey('follower_emoji', FOLLOW_EMOJI_DEFAULT);
  }

  public get notifyOnConnect(): Promise<string | null> {
    return this.valueForKey('notify_on_connect');
  }

  protected valueForKey(key: string, defaultValue: string = null): Promise<string | null> {
    return this.query<string[]>(`
      SELECT \`value\`
      FROM scrubjay_config
      WHERE (\`key\` = ?)
    `, [key])
      .fetch<{ value: string }[]>()
      .then(rows => {
        return rows == null || rows.length !== 1 ? defaultValue : rows[0].value;
      });
  }
}
