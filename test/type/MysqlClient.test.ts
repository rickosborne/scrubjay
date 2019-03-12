import {expect} from 'chai';
import {describe, it, beforeEach} from 'mocha';
import {MysqlAdapter, MysqlClient} from '../../type/MysqlClient';
import * as mysql2 from 'mysql2';
import {RowDataPacket} from 'mysql2';
import {OkPacket} from 'mysql2';
import env, {Logger} from '../../lib/env';

describe('MysqlClient', () => {
  const mockConnection: mysql2.Connection = <mysql2.Connection>{};

  class Testable extends MysqlClient {
    private dbAdapter: MysqlAdapter;

    constructor(
      connectionOptions: mysql2.ConnectionOptions = <mysql2.ConnectionOptions>{},
      optionsCallback?: (options: mysql2.ConnectionOptions) => void,
      logCallback: Logger = env.debug.bind(env)
    ) {
      const adapter: MysqlAdapter = {
        createConnection(options: mysql2.ConnectionOptions) {
          if (optionsCallback != null) {
            optionsCallback(options);
          }
          return mockConnection;
        }
      };
      super(MysqlClient.db(adapter, connectionOptions), logCallback);
      this.dbAdapter = adapter;
    }

    testQuery(expectedSql: string, expectedParams: any[], rows: any, err: mysql2.QueryError | null, block: () => void) {
      let asserted = false;

      function q<T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[]>(
        sql: string,
        values: any | any[] | { [param: string]: any },
        callback?: (err: mysql2.QueryError | null, result: T, fields: mysql2.FieldPacket[]) => any
      ): mysql2.Query {
        asserted = true;
        expect(sql, 'sql').to.equal(expectedSql);
        expect(values, 'params').to.deep.eq(expectedParams);
        callback(err, rows, null);
        return <mysql2.Query>{};
      }

      try {
        mockConnection.query = <any>q;
        block();
      } finally {
        delete mockConnection.query;
      }
      expect(asserted, `testQuery saw query execution`).to.equal(true);
    }
  }

  beforeEach('reset statics', () => {
    MysqlClient._connectionOptions = null;
    MysqlClient._config = null;
    MysqlClient._db = null;
  });

  describe('config (static)', () => {
    it('starts empty', () => expect(MysqlClient._config).to.be.null);
    it('traverses to find mysql config', async () => {
      let optionsChecked = false;
      const connOpts: mysql2.ConnectionOptions = <mysql2.ConnectionOptions>{};
      const testable = new Testable(
        connOpts,
        (options) => {
          optionsChecked = true;
          expect(options).to.equal(connOpts);
        }
      );
      expect(testable).to.be.instanceOf(Testable);
      expect(optionsChecked, 'connectionOptions verified').to.equal(true);
    });
  });
  describe('query', async () => {
    it('passes through sql', async () => {
      let didLog = false;
      let caught: any = null;
      const testable = new Testable(<mysql2.ConnectionOptions>{}, undefined, message => {
        didLog = true;
        const msg: string = typeof message === 'function' ? message() : message;
        expect(msg).matches(/SQL:/, 'SQL statement')
          .and.matches(/Params:/, 'Params')
          .and.matches(/Rows: 1/, 'Record Count');
      });
      testable.testQuery('some sql', [123], [456], null, async () => {
        const result = await testable.query<any[]>(`some sql`, [123]).promise.catch(reason => {
          caught = reason;
        });
        expect(result, 'rows').to.deep.eq([456]);
      });
      expect(didLog, 'logs query stats').equals(true);
      expect(caught).to.equal(null);
    });
    it('passes along errors', async () => {
      const testable = new Testable();
      const error = <mysql2.QueryError>{};
      let caughtError = false;
      testable.testQuery('some sql', [123], [456], error, async () => {
        const result = await testable.query<any[]>(`some sql`, [123]).promise.catch(reason => {
          caughtError = true;
          expect(reason).to.equal(error);
        });
        expect(caughtError).to.equal(true);
        expect(result).to.equal(undefined);
      });
    });
  });
});
