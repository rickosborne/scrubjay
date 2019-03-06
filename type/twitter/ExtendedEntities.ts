import {buildFromObject} from '../FromObject';
import {ExtendedUrl} from './ExtendedUrl';

export class ExtendedEntities {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): ExtendedEntities {
    return buildFromObject(ExtendedEntities, object)
      .list('urls', ExtendedUrl, false)
      .orNull();
  }

  constructor(
    public readonly urls: ExtendedUrl[]
  ) {
  }
}
