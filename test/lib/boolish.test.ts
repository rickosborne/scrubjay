import {expect} from 'chai';
import {describe, it} from 'mocha';
import {boolish} from '../../lib/boolish';

describe('boolish', () => {
  function testFn(values: any[], shouldBe?: any, callback?: (exp: Chai.Assertion) => void) {
    const vals: any[] = [];
    values.forEach(v => {
      vals.push(v);
      if (typeof v === 'string') {
        vals.push(v.toUpperCase());
      }
    });
    for (const val of vals) {
      const label: string = typeof val === 'symbol' ? val.toString() : JSON.stringify(val);
      it(`sees <${typeof val}> ${label} as ${JSON.stringify(shouldBe)}`, () => {
        if (shouldBe === true) {
          expect(boolish(val)).to.equal(true);
        } else if (shouldBe === false) {
          expect(boolish(val)).to.equal(false);
        } else if (callback != null) {
          callback(expect(() => boolish(val), typeof val));
        } else {
          expect(boolish(val)).to.equal(undefined);
        }
      });
    }
  }

  testFn([1, '1', true, 't', 'true', 'y', 'yes', {a: 0}, [0]], true);
  testFn([0, '0', false, 'f', 'false', 'n', 'no', '', {}, []], false);
  testFn([Symbol('foo'), () => true], null, exp => exp.throws(/booleanize/i));
  testFn([undefined], null, null);
});
