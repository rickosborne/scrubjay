import {describe, it} from 'mocha';
import {expect} from 'chai';
import {plural} from '../../lib/plural';

describe('plural', () => {
  it('gives default s for 0', () => expect(plural(0)).equals('s'));
  it('gives default "" for 1', () => expect(plural(1)).equals(''));
  it('gives provided plural for 0', () => expect(plural(0, '!', '?')).equals('!'));
  it('gives provided singular for 1', () => expect(plural(1, '!', '?')).equals('?'));
});
