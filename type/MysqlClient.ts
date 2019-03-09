import * as mysql2 from 'mysql2';
import {config} from './Config';
import env from '../lib/env';
import {FromObject} from './FromObject';
import {unindent} from '../lib/unindent';

type ResultSetCallback<T> = (rows: T) => void;
type ErrorCallback = (err: Error) => void;
type EventualParams<T> = any[] | ((previousResult: T) => any[]);

export interface InsertResults {
  insertId: number;
}

export interface Query<T = object> {
  promise: Promise<T>;

  onError(callback: ErrorCallback): this;

  onResults(callback: ResultSetCallback<T>): this;

  thenQuery<U>(sql: string, params?: EventualParams<T>): Query<U>;
}

export class QueryImpl<T> {
  private _onError: ErrorCallback = null;
  private _onResults: ResultSetCallback<T> = null;
  private err: Error = null;
  private nextQuery: QueryImpl<unknown> = null;
  private rows: T = null;

  constructor(
    private readonly client: MysqlClient,
    public readonly sql: string,
    public readonly params: () => any[]
  ) {
  }

  get promise(): Promise<T> {
    if (this.rows == null) {
      return new Promise((resolve, reject) => this
        .onResults(rows => resolve(rows))
        .onError(reason => reject(reason))
      );
    } else {
      return Promise.resolve(this.rows);
    }
  }

  execute(): void {
    const realParams = typeof this.params === 'function' ? this.params() : this.params == null;
    this.client.db.query(this.sql, realParams, (err: Error, rows: any) => {
      if (err) {
        env.debug(() => `SQL error: ${JSON.stringify(err)} ${this.sql}`);
        this.err = err;
        if (this._onError != null) {
          this._onError(err);
        }
        return;
      }
      if (rows != null && ((Array.isArray(rows) && rows.length > 0) || !Array.isArray(rows))) {
        env.debug(() => {
          const lines = [`SQL: ${unindent(this.sql)}`];
          if (this.params != null && this.params.length > 0) {
            lines.push(`Params: ${JSON.stringify(this.params)}`);
          }
          if (Array.isArray(rows)) {
            lines.push(`Rows: ${rows.length}`);
          } else {
            lines.push(`Results: ${JSON.stringify(rows)}`);
          }
          return lines.join('\n');
        });
      }
      this.rows = rows;
      if (this._onResults != null) {
        this._onResults(rows);
      }
      if (this.nextQuery != null) {
        this.nextQuery.execute();
      }
    });
  }

  // noinspection JSUnusedGlobalSymbols
  onError(callback: ErrorCallback): this {
    if (this.err == null) {
      this._onError = callback;
    } else {
      callback(this.err);
    }
    return this;
  }

  // noinspection JSUnusedGlobalSymbols
  onResults(callback: ResultSetCallback<T>): this {
    if (this.rows == null) {
      this._onResults = callback;
    } else {
      callback(this.rows);
    }
    return this;
  }

  // noinspection JSUnusedGlobalSymbols
  thenQuery<U>(sql: string, params?: EventualParams<T>): QueryImpl<U> {
    const paramResolver: () => any[] = typeof params === 'function' ? () => params(this.rows) : () => params;
    return (this.nextQuery = new QueryImpl<U>(this.client, sql, paramResolver));
  }
}

export abstract class MysqlClient {

  static _db: mysql2.Connection;

  // noinspection JSMethodCanBeStatic
  public get db() {
    if (MysqlClient._db == null) {
      env.debug(() => `Mysql setup`);
      MysqlClient._db = mysql2.createConnection({
        // waitForConnections: true,
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.username,
        password: config.mysql.password,
        database: config.mysql.schema,
        // connectionLimit: 4,
        // queueLimit: 0
      });
    }
    return MysqlClient._db;
  }

  public findObject<T>(type: FromObject<T>, sql: string, params: any[] = []): Promise<T | null> {
    return this.findObjects(type, sql, params)
      .then(items => items.length > 0 ? items[0] : null);
  }

  public findObjects<T>(type: FromObject<T>, sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.query(sql, params)
        .onError(err => reject(err))
        .onResults(rows => {
          if (Array.isArray(rows)) {
            resolve((rows || []).map(row => type.fromObject(row)));
          } else {
            env.debug(() => `Expected an array, but found: ${JSON.stringify(rows)}`);
            resolve([]);
          }
        });
    });
  }

  protected findOne<T>(type: FromObject<T>, fieldName: string, fieldValue: any): Promise<T | null> {
    return this.findObject(type, this.selectOne(fieldName), [fieldValue]);
  }

  public query<T>(sql: string, params?: any[]): Query<T> {
    const query = new QueryImpl<T>(this, sql, () => params);
    query.execute();
    return query;
  }

  public selectOne(fieldName: string): string {
    throw new Error(`Override ${this.constructor.name}.selectOne`);
  }
}

