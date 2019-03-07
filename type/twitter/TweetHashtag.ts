import {buildFromObject} from '../FromObject';
import {Indexed} from './Tweet';

export class TweetHashtag implements Indexed {
  public static fromObject(object: {}): TweetHashtag {
    return buildFromObject(TweetHashtag, object)
      .string('text')
      .list('indices', 'number')
      .orThrow(message => new Error(`Could not build TweetHashtag: ${message}`));
  }

  constructor(
    public readonly text: string,
    public readonly indices: number[],
  ) {}
}
