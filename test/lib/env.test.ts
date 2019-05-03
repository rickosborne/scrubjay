import {expect} from 'chai';
import {describe, it} from 'mocha';
import {Env} from '../../lib/env';
import {buildFromObject} from '../../type/FromObject';
import {PathLike} from 'fs';
import {LogSwitch} from '../../type/Logger';
import {FileSystemAbstraction} from '../../type/FileSystemAbstraction';

const noopLogSwitch: LogSwitch = {
  info: () => {
  },
  error: () => {
  },
  onError: () => {
  },
  onInfo: () => {
  },
};

const noopFileSystem: FileSystemAbstraction = {
  appendFile: () => {
  },
  readFileSync: () => '',
};

describe('Env', () => {
  describe('constructor', () => {
    function testEnv(keys: string[], values: any[], callback: (e: Chai.Assertion) => void) {
      const vals: any[] = [];
      values.forEach(v => {
        vals.push(v);
        if (typeof v === 'string') {
          vals.push(v.toUpperCase());
        }
      });
      for (const key of keys) {
        for (const value of vals) {
          const label: string = typeof value === 'symbol' ? value.toString() : JSON.stringify(value);
          it(`reads ${key} = <${typeof value}> ${label}`, () => {
            callback(expect((new Env(noopLogSwitch, {[key]: value}, noopFileSystem)).isDebug));
          });
        }
      }
    }

    testEnv(['DEBUG', 'NODE_DEBUG'], [1, '1', true, 't', 'true', 'y', 'yes', {a: 0}, [0]], e => e.to.be.true);
    testEnv(['DEBUG', 'NODE_DEBUG'], [0, '0', false, 'f', 'false', 'n', 'no', '', {}, []], e => e.to.be.false);
  });

  describe('readable', () => {
    const env = new Env(noopLogSwitch, {}, noopFileSystem);
    it('handles null', () => {
      expect(env.readable(null)).to.equal('<null>');
    });
    it('handles errors', () => {
      expect(env.readable(new Error('some error message'))).to.equal('Error: some error message');
    });
    it('handles numbers', () => {
      expect(env.readable(123)).to.equal(123);
    });
    it('handles strings', () => {
      expect(env.readable('1.23')).to.equal('1.23');
    });
    it('handles arrays', () => {
      expect(env.readable([1, 2, 3])).to.equal(JSON.stringify([1, 2, 3], null, 2));
    });
  });

  describe('param', () => {
    it('throws if needed', () => {
      expect(() => (new Env(noopLogSwitch, {}, noopFileSystem)).param('foo')).throws(/Missing required parameter: foo/);
    });
    it('finds params', () => {
      expect((new Env(noopLogSwitch, {FOO: 123}, noopFileSystem)).param('FOO')).to.equal(123);
    });
    it('uses default values', () => {
      expect((new Env(noopLogSwitch, {}, noopFileSystem)).param('FOO', '456')).to.equal('456');
    });
    it('uses the converter', () => {
      expect((new Env(noopLogSwitch, {'FOO': 123}, noopFileSystem)).param('FOO', 456, v => parseInt(v, 10))).to.equal(123);
    });
  });

  describe('debug', () => {
    it('does not log if not debug', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({
        info: msg => info.push(msg),
        error: msg => err.push(msg),
        onInfo: () => {
        },
        onError: () => {
        },
      }, {}, noopFileSystem)).debug(`foo`))
        .to.not.increase(info, 'length')
        .and.not.increase(err, 'length');
    });
    it('does log if debug', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({
        info: msg => info.push(msg),
        error: msg => err.push(msg),
        onInfo: () => {
        },
        onError: () => {
        },
      }, {DEBUG: 1}, noopFileSystem)).debug(`foo`))
        .to.increase(info, 'length')
        .and.not.increase(err, 'length');
    });
    it('does log errors if present', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({
        info: msg => info.push(msg),
        error: msg => err.push(msg),
        onInfo: () => {
        },
        onError: () => {
        },
      }, {DEBUG: 1}, noopFileSystem)).debug(`foo`, new Error('bar')))
        .to.increase(info, 'length')
        .and.increase(err, 'length');
    });
  });

  describe('debugFailure', () => {
    it('does what it says on the tin', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({
        info: msg => info.push(msg),
        error: msg => err.push(msg),
        onInfo: () => {
        },
        onError: () => {
        },
      }, {DEBUG: 1}, noopFileSystem)).debugFailure('Some prefix')('foo'))
        .to.increase(info, 'length')
        .and.not.increase(err, 'length');
    });
  });

  describe('fromJson', () => {
    class Testable {
      // noinspection JSUnusedGlobalSymbols
      static fromObject(object: {}): Testable {
        return buildFromObject(Testable, object)
          .string('str')
          .num('num')
          .orThrow(msg => new Error(`Could not build: ${msg}`));
      }

      constructor(public readonly str: string, public readonly num: number) {
      }
    }

    it('works as expected', () => {
      // noinspection JSUnusedLocalSymbols
      const testable = (new Env(noopLogSwitch, {}, {
        appendFile: () => {},
        readFileSync(path: PathLike | number, options: { encoding: string; flag?: string } | string): string {
          return JSON.stringify({
            str: path,
            num: 123
          });
        }
      })).fromJson('some/path', Testable);
      expect(testable.str).to.equal('some/path');
      expect(testable.num).to.equal(123);
    });
  });
});
