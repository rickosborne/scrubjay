import {injectableType} from 'inclined-plane';
import {TwitterConfig} from './TwitterConfig';
import {MysqlConfig} from './MysqlConfig';
import {SlackConfig} from './SlackConfig';
import {AWSConfig} from './AWSConfig';
import {MediaConfig} from './MediaConfig';

export interface ScrubjayConfig {
  readonly aws: AWSConfig;
  readonly baseUrl: string;
  readonly media: MediaConfig;
  readonly mysql: MysqlConfig;
  readonly outputPath: string;
  readonly slack: SlackConfig;
  readonly twitter: TwitterConfig;
  readonly version?: string;
}

export const ScrubjayConfig = injectableType<ScrubjayConfig>('ScrubjayConfig');
