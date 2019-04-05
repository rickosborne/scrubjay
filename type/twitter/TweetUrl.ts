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
      .orThrow((message) => new Error(`Could not create TweetUrl: ${message}`));
  }

  constructor(
    public readonly url: string,
    public readonly display: string,
    public readonly expanded: string,
    public readonly indices: number[],
  ) {
  }
}
