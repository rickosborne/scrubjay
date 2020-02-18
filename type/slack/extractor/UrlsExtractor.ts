import {EntityExtractor} from './EntityExtractor';
import {TweetUrl} from '../../twitter/TweetUrl';
import {TweetEntities} from '../../twitter/TweetEntities';
import {DelayedRenderActions, TweetRenderingFlags} from '../SlackTweetFormatter';

export class UrlsExtractor implements EntityExtractor<TweetUrl> {
  public readonly pad = true;

  access(entities: TweetEntities): TweetUrl[] | null | undefined {
    return entities.urls;
  }

  async convert(item: TweetUrl, flags?: TweetRenderingFlags, later?: DelayedRenderActions): Promise<string> {
    return `<${item.expanded}|${item.display}>`;
  }

  originalText(item: TweetUrl): string {
    return item.url;
  }

}
