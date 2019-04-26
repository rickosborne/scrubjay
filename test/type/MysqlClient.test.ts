import {expect} from 'chai';
import {describe, it} from 'mocha';
import {Mysql2QueryResult, MysqlAdapter, MysqlClient} from '../../type/MysqlClient';
import * as mysql2 from 'mysql2/promise';
import env from '../../lib/env';
import {Logger} from '../../type/Logger';

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
          return Promise.resolve(mockConnection);
        }
      };
      super(logCallback);
      this._db = MysqlClient.db(connectionOptions, adapter);
      this.dbAdapter = adapter;
    }

    public static toRow(data: object): mysql2.RowDataPacket {
      class RowDataPacket {}
      return Object.assign(new RowDataPacket(), data) as any;
    }

    async testQuery<PARAMS, ROWS extends mysql2.RowDataPacket[]>(
      expectedSql: string,
      expectedParams: PARAMS,
      rows: ROWS,
      err: mysql2.QueryError | null,
      block: () => Promise<void>
    ) {
      let asserted = false;

      mockConnection.query = function q(
        sql: string,
        values: any | any[] | { [param: string]: any },
      ): Promise<Mysql2QueryResult> {
        asserted = true;
        expect(sql, 'sql').to.equal(expectedSql);
        expect(values, 'params').to.deep.eq(expectedParams);
        if (err != null) {
          throw err;
        }
        return Promise.resolve<Mysql2QueryResult>([rows, []]);
      } as any;
      await block();
      expect(asserted, `testQuery saw query execution`).to.equal(true);
    }
  }

  describe('config (static)', () => {
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
      const testable = new Testable(<mysql2.ConnectionOptions>{}, undefined, message => {
        didLog = true;
        const msg: string = typeof message === 'function' ? message() : message;
        expect(msg).matches(/SQL:/, 'SQL statement')
          .and.matches(/Params:/, 'Params')
          .and.matches(/Rows: 1/, 'Record Count');
      });
      await testable.testQuery('some sql', [123], [Testable.toRow({num: 456})] as any, null, async () => {
        const result = await testable
          .query(`some sql`, [123])
          .fetch();
        expect(result, 'rows').to.deep.eq([{num: 456}]);
      });
      expect(didLog, 'logs query stats').equals(true);
    });
    it('passes along errors', async () => {
      const testable = new Testable();
      const error = <mysql2.QueryError>{};
      let caughtError = false;
      await testable.testQuery('some sql', [123], [Testable.toRow({num: 456})] as any, error, async () => {
        try {
          const result = await testable
            .query(`some sql`, [123])
            .fetch();
          expect(result).to.equal(undefined);
        } catch (e) {
          caughtError = true;
          expect(e).to.equal(error);
        }
        expect(caughtError).to.equal(true);
      });
    });
  });
});
