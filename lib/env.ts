import * as process from 'process';
import * as fs from 'fs';
import {FromObject} from '../type/FromObject';
import {getTimeHHMMSS} from './time';
import {indentHanging} from './unindent';

const debug = !!process.env['DEBUG'];

type AnySupplier = () => any;

class Env {
  // noinspection JSMethodCanBeStatic
  debug(callback: string | AnySupplier, err: any = null) {
    if (debug) {
      const message = typeof callback === 'function' ? callback() : callback;
      if (message != null) {
        const msg = typeof message === 'string' ? message : JSON.stringify(message);
        console.log(`${getTimeHHMMSS()} ${indentHanging(msg, 9)}`);
      }
      if (err instanceof Error) {
        console.error(err.message);
        console.error(err.stack);
      }
    }
  }

  public debugFailure(prefix: string | (() => string)): (reason: any) => void {
    return (reason) => this.debug(() => `${typeof prefix === 'function' ? prefix() : prefix}: ${this.readable(reason)}`);
  }

  // noinspection JSMethodCanBeStatic
  fromJson<T = {}>(path: string, type?: FromObject<T>): T {
    const object = JSON.parse(fs.readFileSync(path, {encoding: 'utf8'}));
    return type == null ? object : type.fromObject(object);
  }

  param<T = string>(name: string, defaultValue: T = null, converter: (s: string) => T = (s) => <T>(<unknown>s), thisArg: {} = null): T {
    const value = process.env[name];
    if (value == null) {
      if (defaultValue == null) {
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

const env = new Env();
export default env;
