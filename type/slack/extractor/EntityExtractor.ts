import {Indexed} from '../../twitter/Tweet';
import {TweetEntities} from '../../twitter/TweetEntities';
import {DelayedRenderActions, TweetRenderingFlags} from '../SlackTweetFormatter';

export interface EntityExtractor<T extends Indexed> {

  pad: boolean;

  access(entities: TweetEntities): T[] | null | undefined;

  convert(item: T, flags?: TweetRenderingFlags, later?: DelayedRenderActions): Promise<string>;

  originalText(item: T): string;
}
