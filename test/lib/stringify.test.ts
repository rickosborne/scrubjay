import {describe, it} from 'mocha';
import {expect} from 'chai';
import {stringify} from '../../lib/stringify';

describe('stringify', () => {
  it('handles undefined', () => expect(stringify(undefined as any)).equals('(undefined)'));
  it('handles null', () => expect(stringify(null as any)).equals('(null)'));
  it('handles strings', () => expect(stringify('foo')).equals('foo'));
  it('handles symbols', () => expect(stringify(Symbol('foo'))).equals('Symbol(foo)'));
  it('handles true', () => expect(stringify(true)).equals('(true)'));
  it('handles false', () => expect(stringify(false)).equals('(false)'));
  it('handles integers', () => expect(stringify(1234)).equals('1234'));
  it('handles decimals', () => expect(stringify(12.34)).equals('12.34'));
  it('handles named functions', () => expect(stringify(function foo () {})).equals('(foo(){})'));
  it('handles anonymous functions', () => expect(stringify(function () {})).equals('(() => {})'));
  it('handles errors', () => expect(stringify(new Error('some message'))).equals('!!! some message'));
  it('handles arrays', () => expect(stringify([123, new Error('some message')])).equals('[\n  "123",\n  "!!! some message"\n]'));
  it('handles objects', () => expect(stringify({foo: 'bar'})).equals('{\n  "foo": "bar"\n}'));
});
