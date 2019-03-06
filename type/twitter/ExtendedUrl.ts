import {buildFromObject} from '../FromObject';

export class ExtendedUrl {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): ExtendedUrl {
    return buildFromObject(ExtendedUrl, object)
      .string('url')
      .string('display_url')
      .string('expanded_url')
      .orNull();
  }

  constructor(
    public readonly url: string,
    public readonly display: string,
    public readonly expanded: string,
  ) {
  }
}
