import {buildFromObject} from './FromObject';
import * as Twitter from 'twitter';
import env from '../lib/env';

export class MysqlConfig {
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
  }
}

export class TwitterConfig {
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
  }

  get credentials(): Twitter.AccessTokenOptions | Twitter.BearerTokenOptions {
    return {
      access_token_key: this.accessTokenKey,
      access_token_secret: this.accessTokenSecret,
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret
    };
  }
}

export class SlackConfig {
  static fromObject(object: {}): SlackConfig {
    return buildFromObject(SlackConfig, object)
      .string('appId')
      .string('clientId')
      .string('token')
      .string('signingSecret')
      .string('verificationToken')
      .string('oauth')
      .string('botOAuth')
      .orThrow(message => new Error(`Could not configure Slack: ${message}`));
  }

  constructor(
    public readonly appId: string,
    public readonly clientId: string,
    public readonly token: string,
    public readonly signingSecret: string,
    public readonly verificationToken: string,
    public readonly oauth: string,
    public readonly botOAuth: string,
  ) {
  }
}

export class Config {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): Config {
    return buildFromObject(Config, object)
      .string('outputPath')
      .string('baseUrl')
      .obj('twitter', TwitterConfig)
      .obj('mysql', MysqlConfig)
      .obj('slack', SlackConfig)
      .orThrow(message => new Error(`Could not build Config: ${message}`));
  }

  constructor(
    public readonly outputPath: string,
    public readonly baseUrl: string,
    public readonly twitter: TwitterConfig,
    public readonly mysql: MysqlConfig,
    public readonly slack: SlackConfig,
  ) {
  }
}

const configPath = env.param('CONFIG_FILE', '/opt/scrubjay/config.json');
export const config = env.fromJson(configPath, Config);
