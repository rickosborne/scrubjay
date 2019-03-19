import {ScrubjayConfigStore} from './ScrubjayConfigStore';
import {MysqlClient} from '../MysqlClient';
import {FOLLOW_EMOJI_DEFAULT} from '../slack/SlackTweetFormatter';

@ScrubjayConfigStore.provider
export class ScrubjayConfigStoreImpl extends MysqlClient implements ScrubjayConfigStore {
  public get followEmoji(): Promise<string | null> {
    return this.valueForKey('follower_emoji', FOLLOW_EMOJI_DEFAULT);
  }

  protected valueForKey(key: string, defaultValue: string = null): Promise<string | null> {
    return this.query<{ value: string }[]>(`
      SELECT \`value\`
      FROM scrubjay_config
      WHERE (\`key\` = ?)
    `, [key]).promise.then(rows => {
      return rows == null || rows.length !== 1 ? defaultValue : rows[0].value;
    });
  }
}
