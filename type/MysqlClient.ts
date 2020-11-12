import * as mysql2 from 'mysql2/promise';
import env, {Env} from '../lib/env';
import {FromObject} from './FromObject';
import {unindent} from '../lib/unindent';
import {MysqlConfig} from './config/MysqlConfig';
import {injectableType} from 'inclined-plane';
import {Logger} from './Logger';

export type QueryResultType = mysql2.RowDataPacket[] | mysql2.OkPacket | mysql2.RowDataPacket[][] | mysql2.OkPacket[];
export type Mysql2QueryResult = [QueryResultType, mysql2.FieldPacket[]];
export type InsertResults = mysql2.OkPacket;
export type ResultSetConverter<ROW> = (rows: Array<mysql2.RowDataPacket>) => Array<ROW>;

export const CONNECTION_TIMEOUT_MS = 5000;

export interface SplitResults {
  ok?: mysql2.OkPacket;
  okays?: mysql2.OkPacket[];
  rows?: mysql2.RowDataPacket[];
  rowses?: mysql2.RowDataPacket[][];
}

export interface MysqlAdapter {
  createConnection(options: mysql2.ConnectionOptions): Promise<mysql2.Connection>;

  query?<ROWS>(
    sql: string,
    values: any | any[] | { [param: string]: any },
  ): Promise<Mysql2QueryResult>;
}

export interface Query<PARAMS> {
  execute(): Promise<InsertResults | undefined>;

  fetch<ROW>(rowsConverter?: ResultSetConverter<ROW>): Promise<Array<ROW>>;
}

export function isOkPacket(t: any): t is mysql2.OkPacket {
  return t != null && t.constructor.name === 'OkPacket';
}

export class QueryImpl<PARAMS> implements Query<PARAMS> {
  constructor(
    private readonly db: Promise<mysql2.Connection>,
    public readonly sql: string,
    public readonly params?: () => PARAMS,
    private readonly logger: Logger = env.debug.bind(env)
  ) {
  }

  private async doQuery(): Promise<SplitResults> {
    const realParams: PARAMS | undefined = this.params == null ? undefined
      : typeof this.params === 'function' ? this.params() : this.params;
    const db = await this.db;
    let queryResult;
    try {
      queryResult = await db.query(this.sql, realParams);
    } catch (e) {
      throw new Error(`Query: ${this.sql} ; Error: ${e.message}`);
    }
    const rows = Array.isArray(queryResult) ? queryResult[0] : null;
    if (this.logger != null && rows != null && ((Array.isArray(rows) && rows.length > 0) || !Array.isArray(rows))) {
      this.logger(() => {
        const lines = [`SQL: ${unindent(this.sql)}`];
        if (realParams != null && Array.isArray(realParams) && realParams.length > 0) {
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
    const split: SplitResults = {};
    if (Array.isArray(rows)) {
      const okPackets: mysql2.OkPacket[] = [];
      const dataRows: mysql2.RowDataPacket[] = [];
      for (const row of rows) {
        switch (row.constructor.name) {
          case 'OkPacket':
            okPackets.push(<mysql2.OkPacket>row);
            break;
          case 'RowDataPacket':
          case 'TextRow':
            dataRows.push(<mysql2.RowDataPacket>row);
            break;
          default:
            throw new Error(`Unknown result type in ${this.sql}: ${JSON.stringify(row)}`);
        }
      }
      split.rows = dataRows;
      split.okays = okPackets;
      if (okPackets.length === 1) {
        split.ok = okPackets[0];
      }
    } else if (isOkPacket(rows)) {
      split.ok = rows;
    } else if (rows == null) {
      split.ok = undefined;
    }
    return split;
  }

  public execute(): Promise<InsertResults | undefined> {
    return this
      .doQuery()
      .then((split: SplitResults) => split.ok);
  }

  public fetch<ROW>(rowsConverter: ResultSetConverter<ROW> = (rows) => rows as Array<ROW>): Promise<Array<ROW>> {
    return this
      .doQuery()
      .then((split) => Array.isArray(split.rows) ? rowsConverter(split.rows) : []);
  }
}

const mysql2Connection = injectableType<Promise<mysql2.Connection>>('mysql2.Connection');
const mysql2ConnectionOptions = injectableType<mysql2.ConnectionOptions>('mysql2.ConnectionOptions');

export abstract class MysqlClient {

  private get dbConnection(): Promise<mysql2.Connection> {
    const className = this.constructor != null ? (this.constructor.name || '') : '';
    try {
      let conn = this._db;
      if (conn == null) {
        this.connectionId = MysqlClient.nextConnectionId++;
        if (this.env != null) {
          this.env.debug(`MysqlClient(${className}): Creating connection ${this.connectionId}`);
        }
        conn = MysqlClient.db(mysql2ConnectionOptions.getInstance(), e => {
          if (this.env != null) {
            this.env.debug('Failed to get DB instance', e);
          }
        });
        this._db = conn;
      }
      return Promise.resolve(conn);
    } finally {
      if (this.dbTimer != null) {
        clearTimeout(this.dbTimer);
        this.dbTimer = undefined;
      }
      this.dbTimer = setTimeout(async () => {
        if (this._db != null) {
          const conn = await this._db;
          if (this.env != null) {
            this.env.debug(`MysqlClient(${className}): Dropping connection ${this.connectionId}`);
          }
          if (conn != null && typeof conn.destroy === 'function') {
            conn.destroy();
          }
          this._db = undefined;
        }
      }, CONNECTION_TIMEOUT_MS) as unknown as number;
    }
  }

  constructor(
    private readonly logger: Logger = env.debug.bind(env)
  ) {
  }

  protected static nextConnectionId = 1;
  protected _db: Promise<mysql2.Connection> | undefined;
  protected connectionId = -1;
  protected dbTimer: number | undefined;
  @Env.inject env: Env | undefined;

  @mysql2ConnectionOptions.supplier
  public static connectionOptions(
    @MysqlConfig.required config: MysqlConfig
  ): mysql2.ConnectionOptions {
    return {
      waitForConnections: true,
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.schema,
      connectionLimit: 4,
      queueLimit: 0
    };
  }

  @mysql2Connection.supplier
  protected static db(
    @mysql2ConnectionOptions.required connectionOptions: mysql2.ConnectionOptions,
    onError?: (e: any) => void,
    adapter: MysqlAdapter = mysql2,
  ): Promise<mysql2.Connection> {
    try {
      return adapter.createConnection(connectionOptions);
    } catch (e) {
      if (onError != null) {
        onError(e);
      }
      return adapter.createConnection(connectionOptions);
    }
  }

  public findObject<T>(type: FromObject<T>, sql: string, params: any[] = []): Promise<T | null> {
    return this.findObjects(type, sql, params)
      .then(items => items != null && items.length > 0 ? items[0] : null);
  }

  public findObjects<T>(type: FromObject<T>, sql: string, params: any[] = []): Promise<Array<T>> {
    return this
      .query(sql, params)
      .fetch((rows) => rows.map((row) => type.fromObject(row)));
  }

  protected findOne<T>(type: FromObject<T>, fieldName: string, fieldValue: any): Promise<T | null> {
    return this.findObject(type, this.selectOne(fieldName), [fieldValue]);
  }

  public query<PARAMS>(sql: string, params?: PARAMS): Query<PARAMS> {
    return new QueryImpl<PARAMS>(this.dbConnection, sql, params == null ? undefined : () => params, this.logger);
  }

  protected selectOne(fieldName: string): string {
    throw new Error(`Override ${this.constructor.name}.selectOne`);
  }
}

