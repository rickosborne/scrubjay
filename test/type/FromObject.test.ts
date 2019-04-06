import {expect} from 'chai';
import {describe, it} from 'mocha';
import {Builder, buildFromObject, EnvLogger} from '../../type/FromObject';

describe('FromObject', () => {
  describe('buildFromObject', () => {
    class Item {
      // noinspection JSUnusedGlobalSymbols
      public static fromObject(object: object): Item {
        return new Item((object as {name: string}).name || '');
      }

      constructor(public readonly name: string) {}
    }

    class Mega {
      constructor(
        public readonly str: string,
        public readonly num: number,
        public readonly flag: boolean,
        public readonly date: Date,
        public readonly scalar: any,
        public readonly defaulted: string = 'empty',
        public readonly strings?: string[],
        public readonly item?: Item,
        public readonly items?: Item[],
      ) {
      }
    }

    class TestableLogger implements EnvLogger {
      public readonly messages: string[] = [];
      public message: string | undefined;

      debug(callback: () => string): void {
        const msg = callback();
        this.messages.push(msg);
        this.message = msg;
      }
    }

    function completeBuild(object: {} = {}): Builder<Mega> {
      return buildFromObject(Mega, object)
        .string('str', true)
        .num('num', true)
        .bool('flag', true)
        .date('date', true)
        .scalar('scalar', null, true)
        .skip()
        .list('strings', 'string', true)
        .obj('item', Item, true)
        .list('items', Item, true);
    }

    it('returns null for missing required params', () => {
      expect(buildFromObject(Mega, {}).string('str').orNull()).to.eq(null);
    });
    it('returns null for bogus object', () => {
      expect(buildFromObject(Mega, 'foo').string('str').orNull()).to.eq(null);
    });
    it('returns an object for missing optional params', () => {
      expect(buildFromObject(Mega, {}).string('str', false).orNull()).to.be.instanceOf(Mega);
    });
    it('throws for missing required params', () => {
      expect(() => buildFromObject(Mega, {}).string('str').orThrow(() => new Error('nope'))).throws(/nope/);
    });
    it('logs for missing required params', () => {
      const logger = new TestableLogger();
      const block = () => buildFromObject(Mega, {}, logger).string('str', true).orLog();
      expect(block).to.increase(logger.messages, 'length');
      expect(block()).to.eq(null);
    });
    it('creates the object when given all the params', () => {
      const date = new Date(2001, 11, 23, 17, 2, 5);
      const mega = completeBuild({
        str: 'foo',
        num: 123,
        flag: true,
        date: date.valueOf(),
        scalar: {abc: 456},
        strings: ['foo', 'bar'],
        item: {name: 'baz'},
        items: [{name: 'quux'}, {name: 'zap'}]
      }).orThrow(msg => new Error(`Could not create ${msg}`));
      expect(mega).to.be.instanceOf(Mega);
      expect(mega.str).to.equal('foo');
      expect(mega.num).to.equal(123);
      expect(mega.flag).to.equal(true);
      expect(mega.date.valueOf()).to.eq(date.valueOf());
      expect(mega.scalar).to.deep.equal({abc: 456});
      expect(mega.defaulted).to.equal('empty');
      expect(mega.strings).to.deep.equal(['foo', 'bar']);
      expect(mega.item).to.be.instanceOf(Item);
      expect(mega.item!.name).to.equal('baz');
      expect(mega.items!.length).to.equal(2);
      expect(mega.items![0].name).to.equal('quux');
      expect(mega.items![1].name).to.equal('zap');
    });
    it('does not fail for lots of problems', () => {
      expect(completeBuild().orNull()).to.eq(null);
    });
  });
});
