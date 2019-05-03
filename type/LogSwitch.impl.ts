import {Logger, LogSwitch} from './Logger';

@LogSwitch.implementation
export class LogSwitchImpl implements LogSwitch {

  private readonly onErrors: Logger[] = [console.error];
  private readonly onInfos: Logger[] = [console.info];

  private static log(loggers: Logger[], message?: any, ...optionalParams: any[]) {
    const opts = Array.isArray(optionalParams) && optionalParams.length > 0 ? optionalParams : undefined;
    for (const logger of loggers) {
      try {
        opts == null ? logger(message) : logger(message, opts);
      } catch (e) {
        opts == null ? console.log(message) : console.log(message, opts);
      }
    }
  }

  public error(message?: any, ...optionalParams: any[]) {
    LogSwitchImpl.log(this.onErrors, message, ...optionalParams);
  }

  public info(message?: any, ...optionalParams: any[]) {
    LogSwitchImpl.log(this.onInfos, message, ...optionalParams);
  }

  onError(logger: Logger): void {
    this.onErrors.push(logger);
  }

  onInfo(logger: Logger): void {
    this.onInfos.push(logger);
  }
}
