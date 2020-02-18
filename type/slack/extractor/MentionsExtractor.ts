import {EntityExtractor} from './EntityExtractor';
import {TweetMention} from '../../twitter/TweetMention';
import {TweetEntities} from '../../twitter/TweetEntities';
import {DelayedRenderActions, FOLLOW_EMOJI_DEFAULT, TweetRenderingFlags} from '../SlackTweetFormatter';

export class MentionsExtractor implements EntityExtractor<TweetMention> {
  public readonly pad = false;

  access(entities: TweetEntities): TweetMention[] | null | undefined {
    return entities.mentions;
  }

  async convert(item: TweetMention, flags?: TweetRenderingFlags, later?: DelayedRenderActions): Promise<string> {
    return `<https://twitter.com/${item.name}|:${(flags ? flags.followEmoji : null) || FOLLOW_EMOJI_DEFAULT}:${item.name}>`;
  }

  originalText(item: TweetMention): string {
    return `@${item.name}`;
  }

}
