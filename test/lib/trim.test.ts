import {expect} from 'chai';
import {describe, it} from 'mocha';
import {trim} from '../../lib/trim';

describe('trim', () => {
  it('trims left', () => {
    expect(trim('  abc')).to.equal('abc');
  });
  it('trims right', () => {
    expect(trim('abc  ')).to.equal('abc');
  });
  it('trims both', () => {
    expect(trim(' abc  ')).to.equal('abc');
  });
  it('returns empty string if empty string', () => {
    expect(trim('')).to.equal('');
  });
});
