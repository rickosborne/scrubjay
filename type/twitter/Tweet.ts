import {TwitterUser} from './TwitterUser';
import {ExtendedTweet} from './ExtendedTweet';
import {buildFromObject} from '../FromObject';
import * as ejs from 'ejs';

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
    return entityMap[s];
  });
}

const renderTweetHtml = ejs.compile(`
<dl>
<dt>
<% if (tweet.user.url) { %>
<a href="<%= tweet.user.url %>"><%= tweet.user.name %></a>
<% } else { %>
<%= tweet.user.name %>
<% } %> (<a href="https://twitter.com/<%= tweet.user.name %>"><%= tweet.user.name %></a>)
</dt>
<dd>
<%- tweet.textAsHtml %>
</dd>
</dl>
`);

export class Tweet {

  static fromObject(object: {}): Tweet {
    return buildFromObject(Tweet, object)
      .string('text', true)
      .obj('user', TwitterUser, true)
      .string('id_str', true)
      .date('created_at', false)
      .obj('extended_tweet', ExtendedTweet, false)
      .orNull();
  }

  private readonly _text: string;

  constructor(
    text: string,
    public readonly user: TwitterUser,
    public readonly id: string,
    public readonly created?: Date,
    public readonly extended?: ExtendedTweet
  ) {
    this._text = (extended != null && extended.text != null) ? extended.text : text;
  }

  private _html: string;

  get html() {
    if (this._html == null) {
      this._html = renderTweetHtml({
        tweet: this,
      });
    }
    return this._html;
  }

  private _textAsHtml: string;

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

  get text() {
    return this._text;
  }

  get unescapedText(): string {
    return this.text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      ;
  }
}
