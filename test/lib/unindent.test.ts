import {expect} from 'chai';
import {describe, it} from 'mocha';
import {indentHanging, unindent} from '../../lib/unindent';

describe('unindent', () => {
  describe('unindent', () => {
    it('does not mangle unindented text', () => {
      expect(unindent('foo  ')).to.equal('foo  ');
    });
    it('handles leading spaces', () => {
      expect(unindent('\n  foo\n  bar')).to.equal('foo\nbar');
    });
    it('handles leading tabs', () => {
      expect(unindent('\n\t\tfoo\n\t\tbar')).to.equal('foo\nbar');
    });
    it('handles leading tabs and spaces', () => {
      expect(unindent('\n\t foo\n\t bar')).to.equal('foo\nbar');
    });
    it('does not over-unindent', () => {
      expect(unindent('\n  foo\n  bar\n    baz')).to.equal('foo\nbar\n  baz');
    });
  });
  describe('indentHanging', () => {
    it('always returns a string', () => {
      expect(indentHanging(null, 2)).to.equal('');
    });
    it('does what it says', () => {
      expect(indentHanging('foo\nbar\n  baz', 2)).to.equal('foo\n  bar\n    baz');
    });
  });
});
