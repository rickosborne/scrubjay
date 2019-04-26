import * as mysql2 from 'mysql2/promise';
import env from '../lib/env';
import {FromObject} from './FromObject';
import {unindent} from '../lib/unindent';
import * as mysql from 'mysql';
import {MysqlConfig} from './config/MysqlConfig';
import {injectableType} from 'inclined-plane';
import {Logger} from './Logger';

export type QueryResultType = mysql2.RowDataPacket[] | mysql2.OkPacket | mysql2.RowDataPacket[][] | mysql2.OkPacket[];
export type Mysql2QueryResult = [QueryResultType, mysql2.FieldPacket[]];
export type InsertResults = mysql2.OkPacket;
export type ResultSetConverter<ROW> = (rows: Array<mysql2.RowDataPacket>) => Array<ROW>;

export interface SplitResults {
  ok?: mysql2.OkPacket;
  okays?: mysql2.OkPacket[];
  rows?: mysql2.RowDataPacket[];
  rowses?: mysql2.RowDataPacket[][];
}

export interface MysqlAdapter {
  createConnection(options: mysql.ConnectionOptions): Promise<mysql2.Connection>;

  query?<ROWS>(
    sql: string,
    values: any | any[] | { [param: string]: any },
  ): Promise<Mysql2QueryResult>;
}

export interface Query<PARAMS> {
  execute(): Promise<InsertResults | undefined>;

  fetch<ROW>(rowsConverter?: ResultSetConverter<ROW>): Promise<Array<ROW>>;
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
    const queryResult = await db.query(this.sql, realParams);
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
    } else {
      split.ok = rows == null ? undefined : rows;
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

  constructor(
    private readonly logger: Logger = env.debug.bind(env)
  ) {
  }

  @mysql2Connection.inject protected _db: Promise<mysql2.Connection> | undefined;

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
  ): Promise<mysql2.Connection> {
    return adapter.createConnection(connectionOptions);
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
    if (this._db == null) {
      throw new Error('No database connection');
    }
    return new QueryImpl<PARAMS>(this._db, sql, params == null ? undefined : () => params, this.logger);
  }

  protected selectOne(fieldName: string): string {
    throw new Error(`Override ${this.constructor.name}.selectOne`);
  }
}

