import {Logger, LogSwitch, LogSwitchLevel} from './Logger';

const CONSOLE_LEVELS = {
  [LogSwitchLevel.INFO]: console.info,
  [LogSwitchLevel.ERROR]: console.error,
}

@LogSwitch.implementation
export class LogSwitchImpl implements LogSwitch {

  private readonly onErrors: Logger[] = [console.error];
  private readonly onInfos: Logger[] = [console.info];

  private static log(level: LogSwitchLevel, loggers: Logger[], message?: any, ...optionalParams: any[]) {
    const opts = Array.isArray(optionalParams) && optionalParams.length > 0 ? optionalParams : undefined;
    const messageWithLevel = typeof message === 'string' ? `[${level}] ${message}` : message;
    const consoleLogger = CONSOLE_LEVELS[level];
    for (const logger of loggers) {
      try {
        opts == null ? logger(messageWithLevel) : logger(messageWithLevel, opts);
      } catch (e) {
        opts == null ? consoleLogger(messageWithLevel) : consoleLogger(messageWithLevel, opts);
      }
    }
  }

  public error(message?: any, ...optionalParams: any[]) {
    LogSwitchImpl.log(LogSwitchLevel.ERROR, this.onErrors, message, ...optionalParams);
  }

  public info(message?: any, ...optionalParams: any[]) {
    LogSwitchImpl.log(LogSwitchLevel.INFO, this.onInfos, message, ...optionalParams);
  }

  onError(logger: Logger): void {
    this.onErrors.push(logger);
  }

  onInfo(logger: Logger): void {
    this.onInfos.push(logger);
  }
}
