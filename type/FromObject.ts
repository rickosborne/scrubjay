import env from '../lib/env';

export interface FromObject<T> {
  fromObject: ({}) => T;
  name: string;
}

type Constructor<T> = new(...args: any[]) => T;

export interface Builder<T> {
  bool(name: string, required?: boolean): Builder<T>;

  date(name: string, required?: boolean): Builder<T>;

  list<U>(name: string, type: FromObject<U>, required?: boolean): Builder<T>;

  num(name: string, required?: boolean): Builder<T>;

  obj<U>(name: string, type: FromObject<U>, required?: boolean): Builder<T>;

  orLog(): T | null;

  orNull(): T | null;

  orThrow(thrower: (message?: string) => Error): T;

  scalar(name: string, type: string, required?: boolean): Builder<T>;

  skip(): this;

  string(name: string | string[], required?: boolean): Builder<T>;
}

export class Nope<T> implements Builder<T> {
  // noinspection JSUnusedGlobalSymbols
  constructor(
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
    env.debug(() => `!! Could not build: ${JSON.stringify(this)}`);
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

  constructor(public readonly ctor: Constructor<T>, public readonly object: {}) {
  }

  bool(name: string, required: boolean = true): Builder<T> {
    return this.extract(name, 'boolean', required, o => o === true || o === false || o === 1 || o === 0, o => !!o);
  }

  date(name: string, required: boolean = true): Builder<T> {
    return this.extract(
      name,
      'date',
      required,
      o => o instanceof Date || typeof o === 'string' || typeof o === 'number',
      (o: Date | string | number) => o instanceof Date ? o : new Date(o)
    );
  }

  private extract(name: string | string[], typeName: string, required: boolean, tester: (o: {}) => boolean, converter?: (o: {}) => {}) {
    const names: string[] = Array.isArray(name) ? name : [name];
    let value;
    let _name;
    for (_name of names) {
      value = this.object[_name];
      if (value != null) {
        break;
      }
    }
    if (value == null) {
      if (required) {
        return new Nope<T>(`Missing required ${typeName} for ${names}`, _name, typeName, required, this.ctor.name);
      }
      this.args.push(null);
      return this;
    } else if (!tester(value)) {
      return new Nope<T>(`Expected ${typeName} for ${names} found ${typeof value}`, _name, typeName, required, this.ctor.name);
    }
    if (converter != null) {
      value = converter(value);
      if (value == null && required) {
        return new Nope<T>(`Could not read ${typeName}`, _name, typeName, required, this.ctor.name);
      }
    }
    this.args.push(value);
    return this;
  }

  list<U>(name: string, type: FromObject<U>, required: boolean = true): Builder<T> {
    return this.extract(name, type.name, required, v => Array.isArray(v), (v: object[]) => v.map(i => type.fromObject(i)));
  }

  num(name: string, required?: boolean): Builder<T> {
    return this.extract(name, 'number', required, v => typeof v === 'number');
  }

  obj<U>(name: string, type: FromObject<U>, required?: boolean): Builder<T> {
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

  scalar(name: string, type?: string, required: boolean = true): Builder<T> {
    return this.extract(name, type || '(any)', required, o => type == null || typeof o === type);
  }

  skip(): this {
    this.args.push(null);
    return this;
  }

  string(name: string | string[], required: boolean = true): Builder<T> {
    return this.extract(name, 'string', required, o => typeof o === 'string');
  }
}

export function buildFromObject<T>(ctor: Constructor<T>, object: {}): Builder<T> {
  if (object == null || typeof object !== 'object') {
    return new Nope<T>(`Null or not an object: ${typeof object}`, null, null, null, ctor.name);
  }
  return new Maybe<T>(ctor, object);
}
