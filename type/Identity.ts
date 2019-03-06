import {MysqlClient} from './MysqlClient';
import {buildFromObject} from './FromObject';
import {Tweet} from './twitter/Tweet';
import {tweetStore} from './twitter/TweetStore';

export class Identity {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): Identity {
    return buildFromObject(Identity, object)
      .num('id')
      .string('name')
      .string('slug')
      .orNull();
  }

  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly slug: string,
  ) {
  }

  recentTweets(count: number): Promise<Tweet[]> {
    return tweetStore.recentForIdentity(this, count);
  }
}

export class IdentityStore extends MysqlClient {

  findById(id: number): Promise<Identity | null> {
    return this.findOne(Identity, 'id', id);
  }

  findByName(name: string): Promise<Identity | null> {
    return this.findOne(Identity, 'name', name);
  }

  selectOne(fieldName: string) {
    return `
      SELECT id, name, slug
      FROM ident
      WHERE (${fieldName} = ?)
    `;
  }
}

export const identityStore = new IdentityStore();
