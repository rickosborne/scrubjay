import {buildFromObject} from '../FromObject';
import {Indexed} from './Tweet';

export class TweetSymbol implements Indexed {
  public static fromObject(object: {}): TweetSymbol {
    return buildFromObject(TweetSymbol, object)
      .string('text')
      .list('indices', 'number', false)
      .orThrow(message => new Error(`Could not build TweetSymbol: ${message}`));
  }

  constructor(
    public readonly text: string,
    public readonly indices: number[],
  ) {}
}
