import {buildFromObject} from '../FromObject';
import {Indexed} from './Tweet';

export class TweetMention implements Indexed {
  public static fromObject(object: {}): TweetMention {
    return buildFromObject(TweetMention, object)
      .scalar(['id_str', 'id'], null)
      .string('screen_name')
      .string('name')
      .list('indices', 'number')
      .orThrow(message => new Error(`Could not build TweetMention: ${message}`));
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly id: any,
    public readonly name: string,
    public readonly fullName: string,
    public readonly indices: number[],
  ) {
  }
}
