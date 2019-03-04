import * as mysql2 from 'mysql2';
import {config} from './Config';
import env from '../lib/env';
import {FromObject} from './FromObject';

type ResultSetCallback = (rows: object[]) => void;
type ErrorCallback = (err: Error) => void;

interface Query {
  onError(callback: ErrorCallback): this;

  onResults(callback: ResultSetCallback): this;

  thenQuery(sql: string, params?: []): Query;
}

export class QueryImpl {
  private _onError: ErrorCallback = null;
  private _onResults: ResultSetCallback = null;
  private err: Error = null;
  private nextQuery: QueryImpl = null;
  private rows: object[] = null;

  constructor(
    private readonly client: MysqlClient,
    public readonly sql: string,
    public readonly params: any[]
  ) {
  }

  execute(): void {
    this.client.db.query(this.sql, this.params, (err: Error, rows: object[]) => {
      if (err) {
        env.debug(() => `SQL error: ${JSON.stringify(err)} ${this.sql}`);
        this.err = err;
        if (this._onError != null) {
          this._onError(err);
        }
        return;
      }
      env.debug(() => {
        const lines = [`SQL: ${this.sql}`];
        if (this.params != null && this.params.length > 0) {
          lines.push(`Params: ${JSON.stringify(this.params)}`);
        }
        if (rows != null && rows.length > 0) {
          lines.push(`Rows: ${rows.length}`);
        } else {
          lines.push(`No results`);
        }
        return lines.join('\n');
      });
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
  onResults(callback: ResultSetCallback): this {
    if (this.rows == null) {
      this._onResults = callback;
    } else {
      callback(this.rows);
    }
    return this;
  }

  // noinspection JSUnusedGlobalSymbols
  thenQuery(sql: string, params?: []): QueryImpl {
    this.nextQuery = new QueryImpl(this.client, sql, params);
    return this.nextQuery;
  }
}

export abstract class MysqlClient {

  static _db;

  // noinspection JSMethodCanBeStatic
  public get db() {
    if (MysqlClient._db == null) {
      env.debug(() => `Mysql setup`);
      MysqlClient._db = mysql2.createConnection({
        waitForConnections: true,
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.username,
        password: config.mysql.password,
        database: config.mysql.schema,
        connectionLimit: 4,
        queueLimit: 0
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
          resolve((rows || []).map(row => type.fromObject(row)));
        });
    });
  }

  protected findOne<T>(type: FromObject<T>, fieldName: string, fieldValue: any): Promise<T | null> {
    return this.findObject(type, this.selectOne(fieldName), [fieldValue]);
  }

  public query(sql: string, params?: any[]): Query {
    const query = new QueryImpl(this, sql, params);
    query.execute();
    return query;
  }

  public selectOne(fieldName: string): string {
    throw new Error(`Override ${this.constructor.name}.selectOne`);
  }
}

