import {buildFromObject} from '../FromObject';
import {Indexed} from './Tweet';

export class TweetUrl implements Indexed {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TweetUrl {
    return buildFromObject(TweetUrl, object)
      .string('url')
      .string('display_url')
      .string('expanded_url')
      .list('indices', 'number')
      .orNull();
  }

  constructor(
    public readonly url: string,
    public readonly display: string,
    public readonly expanded: string,
    public readonly indices: number[],
  ) {
  }
}
