import {buildFromObject} from '../FromObject';
import {TweetUrl} from './TweetUrl';
import {TweetSymbol} from './TweetSymbol';
import {TweetMedia} from './TweetMedia';
import {TweetHashtag} from './TweetHashtag';
import {TweetMention} from './TweetMention';

export class TweetEntities {
  public static fromObject(object: {}): TweetEntities {
    return buildFromObject(TweetEntities, object)
      .list('urls', TweetUrl, false)
      .list('media', TweetMedia, false)
      .list('symbols', TweetSymbol, false)
      .list('hashtags', TweetHashtag, false)
      .list('user_mentions', TweetMention, false)
      .orThrow(message => new Error(`Could not build TweetEntities: ${message}`));
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly urls?: TweetUrl[],
    public readonly media?: TweetMedia[],
    public readonly symbols?: TweetSymbol[],
    public readonly hashtags?: TweetHashtag[],
    public readonly mentions?: TweetMention[],
  ) {}
}
