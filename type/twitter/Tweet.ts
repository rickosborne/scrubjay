import {TwitterUser} from './TwitterUser';
import {ExtendedTweet} from './ExtendedTweet';
import {buildFromObject} from '../FromObject';
import {TweetEntities} from './TweetEntities';

const entityMap: {[key: string]: string} = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(string: string) {
  return String(string).replace(/[&<>"'`=\/]/g, s => entityMap[s]);
}

export interface Indexed {
  indices: number[];
}

export class Tweet {

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly text: string,
    public readonly user: TwitterUser,
    public readonly id: string,
    public readonly created?: Date,
    public readonly extended?: ExtendedTweet,
    public readonly entities?: TweetEntities,
    public readonly truncated?: boolean,
    public readonly quoted?: Tweet,
    public readonly isQuote?: boolean,
    public readonly quotedId?: any,
    public readonly replyUser?: string,
    public readonly replyTweetId?: any,
    public readonly replyUserId?: any,
    public readonly retweeted?: Tweet,
  ) {
    this._text = (extended != null && extended.text != null) ? extended.text : text;
  }

  // noinspection JSUnusedGlobalSymbols
  get textAsHtml() {
    if (this._textAsHtml == null) {
      let html = escapeHtml(this.text).replace(/\x0d?\x0a/g, '<br>');
      if (this.extended != null && this.extended.entities != null) {
        for (const url of (this.extended.entities.urls || [])) {
          const link = '<' + 'a href="' + escapeHtml(url.expanded) + '">' + escapeHtml(url.display) + '</a>';
          html = html.split(escapeHtml(url.url)).join(link);
        }
      }
      this._textAsHtml = html;
    }
    return this._textAsHtml;
  }

  get longText() {
    return this.extended == null || this.extended.text == null ? this.text : this.extended.text;
  }

  private readonly _text: string;

  private _textAsHtml: string;

  static fromObject(object: {}): Tweet {
    return buildFromObject(Tweet, object)
      .string('text', true)
      .obj('user', TwitterUser, true)
      .string('id_str', true)
      .date('created_at', false)
      .obj('extended_tweet', ExtendedTweet, false)
      .obj('entities', TweetEntities, false)
      .bool('truncated', false)
      .obj('quoted_status', Tweet, false)
      .bool('is_quote_status', false)
      .scalar(['quoted_status_id_str', 'quoted_status_id'], null, false)
      .string('in_reply_to_screen_name', false)
      .scalar(['in_reply_to_status_id_str', 'in_reply_to_status_id'], null, false)
      .scalar(['in_reply_to_user_id_str', 'in_reply_to_user_id'], null, false)
      .obj('retweeted_status', Tweet, false)
      .orNull();
  }

  public static unescapeText(s: string): string {
    return s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      ;
  }
}
