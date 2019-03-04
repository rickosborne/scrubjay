import {MysqlClient} from '../type/MysqlClient';
import env from './env';

type OnSchemaReady = () => void;

class Schema extends MysqlClient {
  private _onReady: OnSchemaReady[] = [];
  private ready = false;

  public migrate() {
    this.query(`
      CREATE TABLE IF NOT EXISTS ident (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(40) NOT NULL,
        slug VARCHAR(40) NOT NULL
      )
      ;
    `).thenQuery(`
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
    `).thenQuery(`
      CREATE TABLE IF NOT EXISTS tweet (
        id VARCHAR(40) NOT NULL PRIMARY KEY,
        username VARCHAR(40) NOT NULL,
        created DATETIME NOT NULL,
        txt TEXT NOT NULL,
        html TEXT,
        CONSTRAINT fk_tweet_username FOREIGN KEY (username) REFERENCES twitter_follow(username)
      )
      ;
    `).thenQuery(`
      CREATE TABLE IF NOT EXISTS twitter_event (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        username VARCHAR(50),
        data JSON NOT NULL
      )
      ;
    `).onResults(() => {
      env.debug('Schema migration complete');
      this.ready = true;
      for (const callback of this._onReady) {
        callback();
      }
    });
  }

  public onReady(onReady: OnSchemaReady) {
    if (this.ready) {
      onReady();
    } else {
      this._onReady.push(onReady);
    }
  }
}

export const migrator = new Schema();

migrator.migrate();
