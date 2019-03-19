import {injectableType} from 'inclined-plane';

export interface MysqlConfig {
  readonly schema: string;
  readonly username: string;
  readonly password: string;
  readonly host: string;
  readonly port: number;
}

export const MysqlConfig = injectableType<MysqlConfig>('MysqlConfig');
