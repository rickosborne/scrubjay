import {injectableType} from 'inclined-plane';

export type Logger = (message?: any, ...optionalParams: any[]) => void;

export interface LogSwitch {
  error(message?: any, ...optionalParams: any[]): void;

  info(message?: any, ...optionalParams: any[]): void;

  onError(logger: Logger): void;

  onInfo(logger: Logger): void;
}

export const LogSwitch = injectableType<LogSwitch>('LogSwitch');
