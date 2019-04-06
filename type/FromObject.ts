import env from '../lib/env';

export interface FromObject<T> {
  fromObject: (object: object) => T;
  name: string;
}

export interface EnvLogger {
  debug(callback: string | (() => string)): void;
}

type Constructor<T> = new(...args: any[]) => T;

export interface Builder<T> {
  bool(name: string, required?: boolean): Builder<T>;

  date(name: string, required?: boolean): Builder<T>;

  list<U>(name: string, type: FromObject<U> | string, required?: boolean): Builder<T>;

  num(name: string, required?: boolean): Builder<T>;

  obj<U>(name: string, type: FromObject<U>, required?: boolean): Builder<T>;

  orLog(): T | null;

  orNull(): T | null;

  orThrow(thrower: (message?: string) => Error): T;

  scalar(name: string | string[], type: string | null, required?: boolean): Builder<T>;

  skip(): this;

  string(name: string | string[], required?: boolean): Builder<T>;
}

export class Nope<T> implements Builder<T> {
  // noinspection JSUnusedGlobalSymbols
  constructor(
    private logger: EnvLogger = env,
    public readonly message?: string,
    public readonly name?: string,
    public readonly typeName?: string,
    public readonly required?: boolean,
    public readonly ctorName?: string,
  ) {
  }

  bool(name: string, required?: boolean): Builder<T> {
    return this;
  }

  date(name: string, required?: boolean): Builder<T> {
    return this;
  }

  list<U>(name: string, type: FromObject<U>, required?: boolean): this {
    return this;
  }

  num(name: string, required?: boolean): Builder<T> {
    return this;
  }

  obj<U>(name: string, type: FromObject<U>, required?: boolean): this {
    return this;
  }

  orLog(): T | null {
    this.logger.debug(() => `!! Could not build: ${JSON.stringify(this)}`);
    return null;
  }

  orNull(): T | null {
    return null;
  }

  orThrow(thrower: (message?: string) => Error): T {
    throw thrower(this.message);
  }

  scalar(name: string, type: string, required?: boolean): this {
    return this;
  }

  skip(): this {
    return this;
  }

  string(name: string | string[], required?: boolean): this {
    return this;
  }
}

export class Maybe<T> implements Builder<T> {
  private args: any[] = [];

  constructor(
    private logger: EnvLogger,
    public readonly ctor: Constructor<T>,
    public readonly object: {},
  ) {
  }

  bool(name: string, required: boolean = true): Builder<T> {
    return this.extract(
      name,
      'boolean',
      required,
      o => o === true || o === false || o === 1 || o === 0,
      o => !!o
    );
  }

  date(name: string, required: boolean = true): Builder<T> {
    return this.extract(
      name,
      'date',
      required,
      o => typeof o === 'string' || typeof o === 'number' || o instanceof Date,
      (o: Date | string | number) => o instanceof Date ? o : new Date(o)
    );
  }

  private extract(
    name: string | string[],
    typeName: string,
    required: boolean,
    tester: (o: any) => boolean,
    converter?: (o: any) => any
  ): Builder<T> {
    const names: string[] = Array.isArray(name) ? name : [name];
    let value: any;
    let _name: any;
    for (_name of names) {
      // @ts-ignore
      value = this.object[_name];
      if (value != null) {
        break;
      }
    }
    if (value == null) {
      if (required) {
        return new Nope<T>(this.logger, `Missing required ${typeName} for ${names}`, _name, typeName, required, this.ctor.name);
      }
      this.args.push(null);
      return this;
    } else if (!tester(value)) {
      return new Nope<T>(this.logger, `Expected ${typeName} for ${names} found ${typeof value}`, _name, typeName, required, this.ctor.name);
    }
    if (converter != null) {
      value = converter(value);
      if (value == null && required) {
        return new Nope<T>(this.logger, `Could not read ${typeName}`, _name, typeName, required, this.ctor.name);
      }
    }
    this.args.push(value);
    return this;
  }

  list<U>(name: string, type: FromObject<U> | string, required: boolean = true): Builder<T> {
    return this.extract(
      name,
      typeof type === 'string' ? type : type.name,
      required,
      v => Array.isArray(v),
      typeof type === 'string' ? undefined : (v: object[]) => v.map(i => type.fromObject(i))
    );
  }

  num(name: string, required: boolean = true): Builder<T> {
    return this.extract(name, 'number', required, (v: any) => typeof v === 'number');
  }

  obj<U>(name: string, type: FromObject<U>, required: boolean = true): Builder<T> {
    return this.extract(name, type.name, required, v => typeof v === 'object', (v: object) => type.fromObject(v));
  }

  orLog(): T {
    return this.orNull();
  }

  orNull(): T {
    return new this.ctor(...this.args);
  }

  orThrow(thrower: (message?: string) => Error): T {
    return this.orNull();
  }

  scalar(name: string | string[], type?: string | null, required: boolean = true): Builder<T> {
    return this.extract(name, type || '(any)', required, o => type == null || typeof o === type);
  }

  skip(): this {
    this.args.push(undefined);
    return this;
  }

  string(name: string | string[], required: boolean = true): Builder<T> {
    return this.extract(name, 'string', required, o => typeof o === 'string');
  }
}

export function buildFromObject<T>(ctor: Constructor<T>, object: {}, logger: EnvLogger = env): Builder<T> {
  if (object == null || typeof object !== 'object') {
    return new Nope<T>(logger, `Null or not an object: ${typeof object}`, '?', '?', true, ctor.name);
  }
  return new Maybe<T>(logger, ctor, object);
}
