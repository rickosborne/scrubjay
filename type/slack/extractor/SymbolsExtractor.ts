import {EntityExtractor} from './EntityExtractor';
import {TweetSymbol} from '../../twitter/TweetSymbol';
import {DelayedRenderActions, TweetRenderingFlags} from '../SlackTweetFormatter';
import {TweetEntities} from '../../twitter/TweetEntities';

export class SymbolsExtractor implements EntityExtractor<TweetSymbol> {
  public readonly pad = true;

  access(entities: TweetEntities): TweetSymbol[] | null | undefined {
    return entities.symbols;
  }

  async convert(item: TweetSymbol, flags?: TweetRenderingFlags, later?: DelayedRenderActions): Promise<string> {
    return `_${item.text}_`;
  }

  originalText(item: TweetSymbol): string {
    return item.text;
  }
}
