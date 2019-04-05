import {buildFromObject} from '../FromObject';

export class TwitterUser {
  // noinspection JSUnusedGlobalSymbols
  static fromObject(object: {}): TwitterUser {
    return buildFromObject(TwitterUser, object)
      .scalar('id', null, false)
      .string('name', false)
      .string(['screen_name', 'username'], false)
      .string('location', false)
      .string('url', false)
      .string('description', false)
      .num('ident_id', false)
      .bool('active', false)
      .string(['profile_image_url_https', 'profile_image_url'], false)
      .string('profile_banner_url', false)
      .string('profile_text_color', false)
      .string('profile_link_color', false)
      .string('profile_background_color', false)
      .string('profile_sidebar_fill_color', false)
      .string('profile_sidebar_border_color', false)
      .string(['profile_background_image_url_https', 'profile_background_image_url'], false)
      .orThrow((message) => new Error(`Could not create TwitterUser: ${message}`));
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly id?: string | number,
    public readonly fullName?: string,
    public readonly name?: string,
    public readonly location?: string,
    public readonly url?: string,
    public readonly description?: string,
    public readonly identId?: number,
    public readonly active?: boolean,
    public readonly profileImage?: string,
    public readonly profileBanner?: string,
    public readonly textColor?: string,
    public readonly linkColor?: string,
    public readonly backgroundColor?: string,
    public readonly sidebarFillColor?: string,
    public readonly sidebarBorderColor?: string,
    public readonly backgroundImage?: string,
  ) {
  }
}

