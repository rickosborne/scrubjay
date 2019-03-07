import {buildFromObject} from '../FromObject';
import {TweetEntities} from './TweetEntities';

export class ExtendedTweet {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): ExtendedTweet {
    return buildFromObject(ExtendedTweet, object)
      .string('full_text')
      .obj('entities', TweetEntities, false)
      .list('display_text_range', 'number', false)
      .orNull();
  }

  constructor(
    public readonly text: string,
    public readonly entities?: TweetEntities,
    public readonly displayRange?: number[]
  ) {
  }
}
