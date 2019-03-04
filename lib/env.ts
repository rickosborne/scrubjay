import * as process from 'process';
import * as fs from 'fs';
import {FromObject} from '../type/FromObject';

const debug = !!process.env['DEBUG'];

type AnySupplier = () => any;

class Env {
  // noinspection JSMethodCanBeStatic
  debug(callback: string | AnySupplier, err: any = null) {
    if (debug) {
      const message = typeof callback === 'function' ? callback() : callback;
      if (message != null) {
        console.log(typeof message === 'string' ? message : JSON.stringify(message));
      }
      if (err instanceof Error) {
        console.error(err.message);
        console.error(err.stack);
      }
    }
  }

  public debugError(prefix: string): (error: Error) => void {
    return (err) => {
      if (err != null) {
        this.debug(() => `${prefix}: ${JSON.stringify(err)}`);
      }
    };
  }

  // noinspection JSMethodCanBeStatic
  fromJson<T = {}>(path: string, type?: FromObject<T>): T {
    const object = JSON.parse(fs.readFileSync(path, {encoding: 'utf8'}));
    return type == null ? object : type.fromObject(object);
  }

  param<T = string>(name: string, defaultValue: T = null, converter: (string) => T = (v) => v, thisArg: {} = null): T {
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
}

const env = new Env();
export default env;
