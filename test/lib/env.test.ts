import {expect} from 'chai';
import {describe, it} from 'mocha';
import {Env, Logger} from '../../lib/env';
import {buildFromObject} from '../../type/FromObject';
import {PathLike} from 'fs';

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
            callback(expect((new Env({[key]: value})).isDebug));
          });
        }
      }
    }

    testEnv(['DEBUG', 'NODE_DEBUG'], [1, '1', true, 't', 'true', 'y', 'yes', {a: 0}, [0]], e => e.to.be.true);
    testEnv(['DEBUG', 'NODE_DEBUG'], [0, '0', false, 'f', 'false', 'n', 'no', '', {}, []], e => e.to.be.false);
  });

  describe('readable', () => {
    const env = new Env();
    it('handles null', () => {
      expect(env.readable(null)).to.equal('<null>');
    });
    it('handles errors', () => {
      expect(env.readable(new Error('some error message'))).to.equal('Error: some error message');
    });
    it('handles numbers', () => {
      expect(env.readable(123)).to.equal('123');
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
      expect(() => (new Env()).param('foo')).throws(/Missing required parameter: foo/);
    });
    it('finds params', () => {
      expect((new Env({FOO: 123})).param('FOO')).to.equal(123);
    });
    it('uses default values', () => {
      expect((new Env({})).param('FOO', '456')).to.equal('456');
    });
    it('uses the converter', () => {
      expect((new Env({'FOO': 123})).param('FOO', 456, v => parseInt(v, 10))).to.equal(123);
    });
  });

  describe('debug', () => {
    it ('does not log if not debug', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({}, msg => info.push(msg), msg => err.push(msg))).debug(`foo`))
        .to.not.increase(info, 'length')
        .and.not.increase(err, 'length');
    });
    it ('does log if debug', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({DEBUG: 1}, msg => info.push(msg), msg => err.push(msg))).debug(`foo`))
        .to.increase(info, 'length')
        .and.not.increase(err, 'length');
    });
    it ('does log errors if present', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({DEBUG: 1}, msg => info.push(msg), msg => err.push(msg))).debug(`foo`, new Error('bar')))
        .to.increase(info, 'length')
        .and.increase(err, 'length');
    });
  });

  describe('debugFailure', () => {
    it('does what it says on the tin', () => {
      const info: string[] = [];
      const err: string[] = [];
      expect(() => (new Env({DEBUG: 1}, msg => info.push(msg))).debugFailure('Some prefix')('foo'))
        .to.increase(info, 'length')
        .and.not.increase(err, 'length');
    });
  });

  describe('fromJson', () => {
    class Testable {
      static fromObject(object: {}): Testable {
        return buildFromObject(Testable, object)
          .string('str')
          .num('num')
          .orThrow(msg => new Error(`Could not build: ${msg}`));
      }

      constructor(public readonly str: string, public readonly num: number) {}
    }

    it('works as expected', () => {
      const testable = (new Env({}, null, null, {
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
