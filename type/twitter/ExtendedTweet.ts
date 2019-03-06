import {buildFromObject} from '../FromObject';
import {ExtendedEntities} from './ExtendedEntities';

export class ExtendedTweet {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): ExtendedTweet {
    return buildFromObject(ExtendedTweet, object)
      .string('full_text')
      .obj('entities', ExtendedEntities)
      .orNull();
  }

  constructor(
    public readonly text: string,
    public readonly entities: ExtendedEntities,
  ) {
  }
}
