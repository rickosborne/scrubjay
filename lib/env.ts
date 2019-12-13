import {FromObject} from '../type/FromObject';
import {getDateYYYYMMDD, getTimeHHMMSS} from './time';
import {indentHanging} from './unindent';
import {obtain, Obtainable} from '../type/Obtainable';
import {boolish} from './boolish';
import {LogSwitch} from '../type/Logger';
import {FileSystemAbstraction} from '../type/FileSystemAbstraction';
import {Environment} from '../type/Environment';
import {injectableType} from 'inclined-plane';
import '../type/LogSwitch.impl';

type AnySupplier = () => any;

export interface Env {
  isDebug: boolean;

  debug(callback: string | AnySupplier, err?: any): void;

  debugFailure(prefix: Obtainable<string>, block?: () => void): (reason: any) => void;

  fromJson<T = {}>(path: string, type?: FromObject<T> | null): T;

  param<T = string>(
    name: string,
    defaultValue?: T | null,
    converter?: (s: string) => T,
    thisArg?: {} | null,
  ): T;

  readable(obj: any): string | number;
}

export const Env = injectableType<Env>('Env');

@Env.implementation
class EnvImpl implements Env {
  private readonly _debug: boolean;

  public get isDebug(): boolean {
    return this._debug;
  }

  constructor(
    @LogSwitch.required private readonly logSwitch: LogSwitch,
    @Environment.required private readonly environment: Environment,
    @FileSystemAbstraction.required private readonly filesystem: FileSystemAbstraction,
  ) {
    this._debug = this.param('DEBUG', false, v => boolish(v, false))
      || this.param('NODE_DEBUG', false, v => boolish(v, false));
  }

  public debug(callback: string | AnySupplier, err: any = null): void {
    if (this._debug) {
      const message = typeof callback === 'function' ? callback() : callback;
      // noinspection SuspiciousTypeOfGuard
      const msg = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
      if (msg != null) {
        const now = new Date();
        this.logSwitch.info(`${getDateYYYYMMDD(now)} ${getTimeHHMMSS(now)} ${indentHanging(msg, 20)}`);
      }
      if (err instanceof Error) {
        this.logSwitch.error(err.message);
        this.logSwitch.error(err.stack);
      }
    }
  }

  public debugFailure(prefix: Obtainable<string>, block?: () => void): (reason: any) => void {
    return (reason) => {
      this.debug(() => `${obtain(prefix)}: ${this.readable(reason)}`);
      if (block != null) {
        block();
      }
    };
  }

  public fromJson<T = {}>(path: string, type?: FromObject<T> | null): T {
    const object = JSON.parse(this.filesystem.readFileSync(path, {encoding: 'utf8'}));
    return type == null ? object : type.fromObject(object);
  }

  public param<T = string>(
    name: string,
    defaultValue: T | undefined | null = null,
    converter: (s: string) => T = (s) => <T>(<unknown>s),
    thisArg: {} | undefined | null = null,
  ): T {
    const value = this.environment[name];
    if (value == null) {
      if (defaultValue === null || defaultValue === undefined) {
        throw new Error(`Missing required parameter: ${name}`);
      }
      this.debug(() => `${name} (default: ${defaultValue}) (default)`);
      return defaultValue;
    }
    const converted = converter.call(thisArg, value);
    this.debug(() => `${name} (default: ${defaultValue}) ${converted}`);
    return converted;
  }

  public readable(obj: any): string | number {
    if (obj == null) {
      return '<null>';
    } else if (obj instanceof Error) {
      return `${obj.name}: ${obj.message}`;
    } else if (typeof obj === 'number' || typeof obj === 'string') {
      return obj;
    } else if (Array.isArray(obj)) {
      return JSON.stringify(obj.map(item => this.readable(item)), null, 2);
    } else {
      return JSON.stringify(obj, null, 2);
    }
  }
}

const env: Env = Env.getInstance();
export default env;

export const TestableEnv: typeof EnvImpl = EnvImpl;
