import {injectableType} from 'inclined-plane';
import * as process from 'process';

export interface Environment {
  [key: string]: any;
}

export const Environment = injectableType<Environment>('Environment');

// noinspection JSUnusedLocalSymbols
class EnvironmentProvider {
  @Environment.supplier
  public static environment(): Environment {
    return process.env;
  }
}
