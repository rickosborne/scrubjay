import {expect} from 'chai';
import {describe, it} from 'mocha';
import {obtain, resolve} from '../../type/Obtainable';

describe('Obtainable', () => {
  describe('obtain', () => {
    it('handles scalars', () => {
      expect(obtain(123)).to.equal(123);
    });
    it('handles suppliers', () => {
      expect(obtain(() => 456)).to.equal(456);
    });
    it('handles null literals', () => {
      expect(obtain(null)).to.eq(null);
    });
    it('handles null suppliers', () => {
      expect(obtain(() => null)).to.eq(null);
    });
  });
  describe('resolve', () => {
    it('handles scalars', async () => {
      expect(await resolve(123)).to.equal(123);
    });
    it('handles suppliers', async () => {
      expect(await resolve(() => 456)).to.equal(456);
    });
    it('handles null literals', async () => {
      expect(await resolve(null)).to.eq(null);
    });
    it('handles null suppliers', async () => {
      expect(await resolve(() => null)).to.eq(null);
    });
    it('handles promises for scalars', async () => {
      expect(await resolve(Promise.resolve(123))).to.equal(123);
    });
    it('handles promises for suppliers', async () => {
      expect(await resolve(() => Promise.resolve(456))).to.equal(456);
    });
    it('handles promises for null literals', async () => {
      expect(await resolve(Promise.resolve(null))).to.eq(null);
    });
    it('handles promises for null suppliers', async () => {
      expect(await resolve(() => Promise.resolve(null))).to.eq(null);
    });
  });
});
