import {MysqlClient} from './MysqlClient';
import {buildFromObject} from './FromObject';
import {Tweet} from './twitter/Tweet';

export class Identity {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): Identity | null {
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
    throw new Error(`Not implemented: recentTweets`);
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
