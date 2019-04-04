import {MysqlClient} from '../type/MysqlClient';
import env from './env';
import {buildInstance} from 'inclined-plane';

type OnSchemaReady = () => void;

class Schema extends MysqlClient {
  private _onReady: OnSchemaReady[] = [];
  private ready = false;

  public async migrate(): Promise<void> {
    await this.query<void>(`
      CREATE TABLE IF NOT EXISTS ident (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(40) NOT NULL,
        slug VARCHAR(40) NOT NULL
      )
      ;
    `).execute();
    await this.query<void>(`
      CREATE TABLE IF NOT EXISTS twitter_follow (
        id VARCHAR(40),
        username VARCHAR(40) NOT NULL PRIMARY KEY,
        location TINYTEXT,
        url TINYTEXT,
        description TINYTEXT,
        ident_id INT NOT NULL,
        active BIT NOT NULL DEFAULT b'0',
        CONSTRAINT ux_twitter_follow_username UNIQUE (username),
        CONSTRAINT fk_twitter_follow_ident FOREIGN KEY (ident_id) REFERENCES ident(id)
      )
      ;
    `).execute();
    await this.query<void>(`
      CREATE TABLE IF NOT EXISTS tweet (
        id VARCHAR(40) NOT NULL PRIMARY KEY,
        username VARCHAR(40) NOT NULL,
        created DATETIME NOT NULL,
        txt TEXT NOT NULL,
        html TEXT,
        CONSTRAINT fk_tweet_username FOREIGN KEY (username) REFERENCES twitter_follow(username)
      )
      ;
    `).execute();
    await this.query<void>(`
      CREATE TABLE IF NOT EXISTS twitter_event (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        username VARCHAR(50),
        data JSON NOT NULL
      )
      ;
    `).execute();
    await this.query<void>(`
      CREATE TABLE IF NOT EXISTS slack_feed (
        channel_id VARCHAR(40) NOT NULL PRIMARY KEY,
        channel_name VARCHAR(40) NOT NULL
      )
      ;
    `).execute();
    await this.query<void>(`
      CREATE TABLE IF NOT EXISTS slack_feed_twitter (
        slack_channel_id VARCHAR(40) NOT NULL,
        twitter_username VARCHAR(40) NOT NULL,
        PRIMARY KEY (slack_channel_id, twitter_username),
        FOREIGN KEY FK_slack_feed_twitter_channel(slack_channel_id) REFERENCES slack_feed(channel_id),
        FOREIGN KEY FK_slack_feed_twitter_username(twitter_username) REFERENCES twitter_follow(username)
      )
      ;
    `).execute();
    env.debug('Schema migration complete');
    this.ready = true;
    for (const callback of this._onReady) {
      callback();
    }
  }

  public onReady(onReady: OnSchemaReady) {
    if (this.ready) {
      onReady();
    } else {
      this._onReady.push(onReady);
    }
  }
}

export const migrator = buildInstance(Schema);

migrator.migrate().catch(env.debugFailure('Migrator failed'));
