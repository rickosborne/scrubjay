import {EntityExtractor} from './EntityExtractor';
import {TweetHashtag} from '../../twitter/TweetHashtag';
import {TweetEntities} from '../../twitter/TweetEntities';
import {DelayedRenderActions, TweetRenderingFlags} from '../SlackTweetFormatter';

export class HashtagExtractor implements EntityExtractor<TweetHashtag> {
  public readonly pad = true;

  access(entities: TweetEntities): TweetHashtag[] | null | undefined {
    return entities.hashtags;
  }

  async convert(item: TweetHashtag, flags?: TweetRenderingFlags, later?: DelayedRenderActions): Promise<string> {
    return `_#${item.text}_`;
  }

  originalText(item: TweetHashtag): string {
    return `#${item.text}`;
  }

}
