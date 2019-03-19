import {injectableType} from 'inclined-plane';
import {TwitterConfig} from './TwitterConfig';
import {MysqlConfig} from './MysqlConfig';
import {SlackConfig} from './SlackConfig';

export interface ScrubjayConfig {
  readonly outputPath: string;
  readonly baseUrl: string;
  readonly twitter: TwitterConfig;
  readonly mysql: MysqlConfig;
  readonly slack: SlackConfig;
  readonly version?: string;
}

export const ScrubjayConfig = injectableType<ScrubjayConfig>('ScrubjayConfig');
