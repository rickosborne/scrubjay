import {TwitterUser} from './TwitterUser';
import {ExtendedTweet} from './ExtendedTweet';
import {buildFromObject} from '../FromObject';
import {TweetEntities} from './TweetEntities';

export interface Indexed {
  indices: number[];
}

export class Tweet {
  private readonly _entities: TweetEntities;

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly text: string,
    public readonly user: TwitterUser,
    public readonly id: string,
    public readonly created?: Date,
    public readonly extended?: ExtendedTweet,
    public readonly entities?: TweetEntities,
    public readonly extendedEntities?: TweetEntities,
    public readonly truncated?: boolean,
    public readonly quoted?: Tweet,
    public readonly isQuote?: boolean,
    public readonly quotedId?: any,
    public readonly replyUser?: string,
    public readonly replyTweetId?: any,
    public readonly replyUserId?: any,
    public readonly retweeted?: Tweet,
    public readonly source?: any,
  ) {
    this._text = (extended != null && extended.text != null) ? extended.text : text;
    this._entities = Object.assign({},
        entities,
        this.extended != null && this.extended.entities != null ? this.extended.entities : {},
        extendedEntities,
    );
  }

  get longText(): string {
    if (this.extended != null && this.extended.text != null) {
      return this.extended.text;
    }
    if (this.retweeted != null) {
      return this.retweeted.longText;
    }
    return this.text;
  }

  get longTextEntities(): TweetEntities | undefined {
    if (this._entities != null && Object.keys(this._entities).length > 0) {
      return this._entities;
    }
    if (this.retweeted != null) {
      return this.retweeted.longTextEntities;
    }
    return this._entities;
  }

  private readonly _text: string;

  static fromObject(object: {}): Tweet {
    return buildFromObject(Tweet, object)
      .string('text', true)
      .obj('user', TwitterUser, true)
      .string('id_str', true)
      .date('created_at', false)
      .obj('extended_tweet', ExtendedTweet, false)
      .obj('entities', TweetEntities, false)
      .obj('extended_entities', TweetEntities, false)
      .bool('truncated', false)
      .obj('quoted_status', Tweet, false)
      .bool('is_quote_status', false)
      .scalar(['quoted_status_id_str', 'quoted_status_id'], null, false)
      .string('in_reply_to_screen_name', false)
      .scalar(['in_reply_to_status_id_str', 'in_reply_to_status_id'], null, false)
      .scalar(['in_reply_to_user_id_str', 'in_reply_to_user_id'], null, false)
      .obj('retweeted_status', Tweet, false)
      .source()
      .orThrow((message) => new Error(`Could not create Tweet: ${message}`));
  }

  public static unescapeText(s: string): string {
    return s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      ;
  }
}
