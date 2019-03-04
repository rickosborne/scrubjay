import * as fs from 'fs';

export interface ToObject {
  toObject(keys?: string[]): object;
}

export interface ToJson extends ToObject {
  toJson(): string;
}

export class Objectable implements ToObject {
  toObject(keys: string[] = []): object {
    const object = {};
    for (const key of keys) {
      const value = this[key];
      object[key] = value instanceof Objectable ? value.toObject() : value;
    }
    return object;
  }
}

export class Jsonable extends Objectable implements ToJson {
  toJson(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }
}
