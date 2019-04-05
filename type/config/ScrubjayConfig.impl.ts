import {ScrubjayConfig} from './ScrubjayConfig';
import env from '../../lib/env';
import {buildFromObject} from '../FromObject';
import {MysqlConfig} from './MysqlConfig';
import {SlackConfig} from './SlackConfig';
import {TwitterConfig, TwitterCredentials} from './TwitterConfig';
import {boolish} from '../../lib/boolish';

export class SlackConfigImpl implements SlackConfig {
  static fromObject(object: {}): SlackConfigImpl {
    return buildFromObject(SlackConfigImpl, object)
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

export class TwitterConfigImpl implements TwitterConfig {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TwitterConfigImpl {
    return buildFromObject(TwitterConfigImpl, object)
      .string('accessTokenKey')
      .string('accessTokenSecret')
      .string('consumerKey')
      .string('consumerSecret')
      .orThrow((message) => new Error(`Could not build TwitterConfig: ${message}`));
  }

  constructor(
    public readonly accessTokenKey: string,
    public readonly accessTokenSecret: string,
    public readonly consumerKey: string,
    public readonly consumerSecret: string,
  ) {
  }

  get credentials(): TwitterCredentials {
    return {
      access_token_key: this.accessTokenKey,
      access_token_secret: this.accessTokenSecret,
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret
    };
  }

  // noinspection JSMethodCanBeStatic
  public get connectStream(): boolean {
    return env.param('TWITTER_STREAM', true, (s) => boolish(s, true));
  }
}

class MysqlConfigImpl implements MysqlConfig {
  // noinspection JSUnusedGlobalSymbols
  public static fromObject(object: {}): MysqlConfigImpl {
    return buildFromObject(MysqlConfigImpl, object)
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

class ScrubjayConfigImpl implements ScrubjayConfig {
  public static fromObject(object: {}): ScrubjayConfigImpl {
    return buildFromObject(ScrubjayConfigImpl, object)
      .string('outputPath')
      .string('baseUrl')
      .obj('twitter', TwitterConfigImpl)
      .obj('mysql', MysqlConfigImpl)
      .obj('slack', SlackConfigImpl)
      .string('version', false)
      .orThrow(message => new Error(`Could not build Config: ${message}`));
  }

  @ScrubjayConfig.supplier
  public static getInstance(): ScrubjayConfig {
    const configPath = env.param('CONFIG_FILE', '/opt/scrubjay/config.json');
    return env.fromJson(configPath, ScrubjayConfigImpl);
  }

  @MysqlConfig.supplier
  public static getMysqlConfig(@ScrubjayConfig.required scrubjayConfig: ScrubjayConfig): MysqlConfig {
    return scrubjayConfig.mysql;
  }

  @SlackConfig.supplier
  public static getSlackConfig(@ScrubjayConfig.required scrubjayConfig: ScrubjayConfig): SlackConfig {
    return scrubjayConfig.slack;
  }

  @TwitterConfig.supplier
  public static getTwitterConfig(@ScrubjayConfig.required scrubjayConfig: ScrubjayConfig): TwitterConfig {
    return scrubjayConfig.twitter;
  }

  constructor(
    public readonly outputPath: string,
    public readonly baseUrl: string,
    public readonly twitter: TwitterConfigImpl,
    public readonly mysql: MysqlConfig,
    public readonly slack: SlackConfigImpl,
    public readonly version?: string
  ) {
  }
}

export const TestableScrubjayConfig = ScrubjayConfigImpl;
