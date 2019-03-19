import * as mysql2 from 'mysql2';
import env, {Logger} from '../lib/env';
import {FromObject} from './FromObject';
import {unindent} from '../lib/unindent';
import * as mysql from 'mysql';
import {RowDataPacket} from 'mysql2';
import {OkPacket} from 'mysql2';
import {FieldPacket} from 'mysql2';
import {MysqlConfig} from './config/MysqlConfig';
import {injectableType} from 'inclined-plane';

type ResultSetCallback<T> = (rows: T) => void;
type ErrorCallback = (err: Error) => void;
type EventualParams<T> = any[] | ((previousResult: T) => any[]);

export interface MysqlAdapter {
  createConnection(options: mysql.ConnectionOptions): mysql2.Connection;

  query?<T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[]>(
    sql: string,
    values: any | any[] | { [param: string]: any },
    callback?: (err: any, result: T, fields: FieldPacket[]) => any
  ): mysql2.Query;
}

export type InsertResults = mysql2.OkPacket;

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
    private readonly db: mysql2.Connection,
    public readonly sql: string,
    public readonly params: () => any[],
    private readonly logger: Logger = env.debug.bind(env),
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
    const realParams: any[] = typeof this.params === 'function' ? this.params() : this.params;
    this.db.query(this.sql, realParams, (err: Error, rows: any) => {
      if (err) {
        if (this.logger != null) {
          this.logger(() => `SQL error: ${JSON.stringify(err)} ${this.sql}`);
        }
        this.err = err;
        if (this._onError != null) {
          this._onError(err);
        }
        return;
      }
      if (this.logger != null && rows != null && ((Array.isArray(rows) && rows.length > 0) || !Array.isArray(rows))) {
        this.logger(() => {
          const lines = [`SQL: ${unindent(this.sql)}`];
          if (realParams != null && realParams.length > 0) {
            lines.push(`Params: ${JSON.stringify(realParams)}`);
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
    return (this.nextQuery = new QueryImpl<U>(this.db, sql, paramResolver));
  }
}

const mysql2Connection = injectableType<mysql2.Connection>('mysql2.Connection');
const mysql2ConnectionOptions = injectableType<mysql2.ConnectionOptions>('mysql2.ConnectionOptions');

export abstract class MysqlClient {

  constructor(
    private readonly logger: Logger = env.debug.bind(env)
  ) {
  }

  @mysql2Connection.inject protected _db: mysql2.Connection | undefined;

  @mysql2ConnectionOptions.supplier
  public static connectionOptions(
    @MysqlConfig.required config: MysqlConfig
  ): mysql2.ConnectionOptions {
    return {
      // waitForConnections: true,
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.schema,
      // connectionLimit: 4,
      // queueLimit: 0
    };
  }

  @mysql2Connection.supplier
  protected static db(
    @mysql2ConnectionOptions.required connectionOptions: mysql2.ConnectionOptions,
    adapter: MysqlAdapter = mysql2,
  ): mysql2.Connection {
    return adapter.createConnection(connectionOptions);
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
            if (this.logger != null) {
              this.logger(() => `Expected an array, but found: ${JSON.stringify(rows)}`);
            }
            resolve([]);
          }
        });
    });
  }

  protected findOne<T>(type: FromObject<T>, fieldName: string, fieldValue: any): Promise<T | null> {
    return this.findObject(type, this.selectOne(fieldName), [fieldValue]);
  }

  public query<T>(sql: string, params?: any[]): Query<T> {
    const query = new QueryImpl<T>(this._db, sql, () => params, this.logger);
    query.execute();
    return query;
  }

  protected selectOne(fieldName: string): string {
    throw new Error(`Override ${this.constructor.name}.selectOne`);
  }
}

