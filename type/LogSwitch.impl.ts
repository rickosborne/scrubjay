import {Logger, LogSwitch} from './Logger';

@LogSwitch.implementation
export class LogSwitchImpl implements LogSwitch {

  private readonly onErrors: Logger[] = [console.error];
  private readonly onInfos: Logger[] = [console.info];

  private static log(loggers: Logger[], message?: any, ...optionalParams: any[]) {
    for (const logger of loggers) {
      try {
        logger(message, optionalParams);
      } catch (e) {
        console.log(message, optionalParams);
      }
    }
  }

  public error(message?: any, ...optionalParams: any[]) {
    LogSwitchImpl.log(this.onErrors, message, optionalParams);
  }

  public info(message?: any, ...optionalParams: any[]) {
    LogSwitchImpl.log(this.onInfos, message, optionalParams);
  }

  onError(logger: Logger): void {
    this.onErrors.push(logger);
  }

  onInfo(logger: Logger): void {
    this.onInfos.push(logger);
  }
}
