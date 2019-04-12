import * as process from 'process';
import * as fs from 'fs';
import {FromObject} from '../type/FromObject';
import {getTimeHHMMSS} from './time';
import {indentHanging} from './unindent';
import {obtain, Obtainable} from '../type/Obtainable';
import {boolish} from './boolish';
import {PathLike} from 'fs';

type AnySupplier = () => any;
export type Logger = (message?: any, ...optionalParams: any[]) => void;
interface Environment {
  [key: string]: any;
}

interface FileSystemAbstraction {
  readFileSync(path: PathLike | number, options: { encoding: string; flag?: string; } | string): string;
}

export class Env {
  private readonly _debug: boolean;

  constructor(
    private readonly _env: Environment = {},
    public readonly infoLogger: Logger = console.log,
    public readonly errorLogger: Logger = console.error,
    private _fs: FileSystemAbstraction = fs
  ) {
    this._debug = this.param('DEBUG', false, v => boolish(v, false))
      || this.param('NODE_DEBUG', false, v => boolish(v, false));
  }

  public get isDebug(): boolean {
    return this._debug;
  }

  public debug(callback: string | AnySupplier, err: any = null) {
    if (this._debug) {
      const message = typeof callback === 'function' ? callback() : callback;
      // noinspection SuspiciousTypeOfGuard
      const msg = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
      if (msg != null) {
        this.infoLogger(`${getTimeHHMMSS()} ${indentHanging(msg, 9)}`);
      }
      if (err instanceof Error) {
        this.errorLogger(err.message);
        this.errorLogger(err.stack);
      }
    }
  }

  public debugFailure(prefix: Obtainable<string>): (reason: any) => void {
    return (reason) => this.debug(() => `${obtain(prefix)}: ${this.readable(reason)}`);
  }

  // noinspection JSMethodCanBeStatic
  public fromJson<T = {}>(path: string, type?: FromObject<T> | null): T {
    const object = JSON.parse(this._fs.readFileSync(path, {encoding: 'utf8'}));
    return type == null ? object : type.fromObject(object);
  }

  public param<T = string>(
    name: string,
    defaultValue: T | undefined | null = null,
    converter: (s: string) => T = (s) => <T>(<unknown>s),
    thisArg: {} | undefined | null = null,
  ): T {
    const value = this._env[name];
    if (value == null) {
      if (defaultValue === null || defaultValue === undefined) {
        throw new Error(`Missing required parameter: ${name}`);
      }
      this.debug(() => `${name}=${defaultValue} (default)`);
      return defaultValue;
    }
    this.debug(() => `${name}=${defaultValue}`);
    return converter.call(thisArg, value);
  }

  // noinspection JSMethodCanBeStatic
  public readable(obj: any): string {
    if (obj == null) {
      return '<null>';
    } else if (obj instanceof Error) {
      return `${obj.name}: ${obj.message}`;
    } else if (['string', 'number'].indexOf(typeof obj) >= 0) {
      return '' + obj;
    } else {
      return JSON.stringify(obj, null, 2);
    }
  }
}

const env = new Env(process.env, console.log, console.error, fs);
export default env;
