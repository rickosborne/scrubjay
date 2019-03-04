import {buildFromObject} from './FromObject';
import {Jsonable} from './ToJson';
import * as Twitter from 'twitter';
import env from '../lib/env';

export class MysqlConfig extends Jsonable {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): MysqlConfig {
    return buildFromObject(MysqlConfig, object)
      .string('schema')
      .string('username')
      .string('password')
      .string('host', false)
      .num('port', false)
      .orThrow(message => new Error(`Could not create MysqlConfig: ${message}`));
  }

  constructor(
    public readonly schema: string,
    public readonly username: string,
    public readonly password: string,
    public readonly host: string = '127.0.0.1',
    public readonly port: number = 3306,
  ) {
    super();
  }
}

export class TwitterConfig extends Jsonable {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TwitterConfig {
    return buildFromObject(TwitterConfig, object)
      .string('accessTokenKey')
      .string('accessTokenSecret')
      .string('consumerKey')
      .string('consumerSecret')
      .orNull();
  }

  constructor(
    public readonly accessTokenKey: string,
    public readonly accessTokenSecret: string,
    public readonly consumerKey: string,
    public readonly consumerSecret: string,
  ) {
    super();
  }

  get credentials(): Twitter.AccessTokenOptions | Twitter.BearerTokenOptions {
    return {
      access_token_key: this.accessTokenKey,
      access_token_secret: this.accessTokenSecret,
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret
    };
  }

  toObject(keys: string[] = []): object {
    return super.toObject(keys);
  }
}

export class Config extends Jsonable {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): Config {
    return buildFromObject(Config, object)
      .string('outputPath')
      .string('baseUrl')
      .obj('twitter', TwitterConfig)
      .obj('mysql', MysqlConfig)
      .orThrow(message => new Error(`Could not build Config: ${message}`));
  }

  constructor(
    public readonly outputPath: string,
    public readonly baseUrl: string,
    public readonly twitter: TwitterConfig,
    public readonly mysql: MysqlConfig,
  ) {
    super();
  }

  toObject(): object {
    return super.toObject(['outputPath', 'baseUrl', 'subscriptions', 'twitter', 'mysql']);
  }
}

const configPath = env.param('CONFIG_FILE', '/opt/scrubjay/config.json');
export const config = env.fromJson(configPath, Config);
