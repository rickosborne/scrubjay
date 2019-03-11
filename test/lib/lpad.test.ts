import {expect} from 'chai';
import {describe, it} from 'mocha';
import {lpad} from '../../lib/lpad';

describe('lpad', () => {
  it('handles adds for numbers', () => {
    expect(lpad(45, '0', 3)).to.equal('045');
  });
  it('handles adds for strings', () => {
    expect(lpad('56', '0', 3)).to.equal('056');
  });
  it('handles replaces', () => {
    expect(lpad('', '0', 3)).to.equal('000');
  });
  it('handles no-ops for strings', () => {
    expect(lpad('ab', '0', 2)).to.equal('ab');
  });
  it('handles no-ops for numbers', () => {
    expect(lpad(13, '0', 2)).to.equal('13');
  });
  it('handles already too big for numbers', () => {
    expect(lpad(456, '0', 2)).to.equal('456');
  });
  it('handles already too big for strings', () => {
    expect(lpad('567', '0', 2)).to.equal('567');
  });
});
