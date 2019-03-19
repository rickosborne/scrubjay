import {buildFromObject} from '../FromObject';
import {Indexed} from './Tweet';

export class TweetMediaSize {
  public static fromObject(object: {}): TweetMediaSize {
    return buildFromObject(TweetMediaSize, object)
      .num('h', false)
      .num('w', false)
      .string('resize', false)
      .orThrow(message => new Error(`Could not build TweetMediaSize: ${message}`));
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly height?: number,
    public readonly width?: number,
    public readonly resize?: string,
  ) {
  }
}

export class TweetMediaSizes {
  public static fromObject(object: {}): TweetMediaSizes {
    return buildFromObject(TweetMediaSizes, object)
      .obj('large', TweetMediaSize, false)
      .obj('small', TweetMediaSize, false)
      .obj('thumb', TweetMediaSize, false)
      .obj('medium', TweetMediaSize, false)
      .orThrow(message => new Error(`Could not build TweetMediaSizes: ${message}`));
  }

  constructor(
    public readonly large?: TweetMediaSize,
    public readonly small?: TweetMediaSize,
    public readonly thumb?: TweetMediaSize,
    public readonly medium?: TweetMediaSize,
  ) {
  }
}

export class TweetMediaVideoVariant {
  public static fromObject(object: {}): TweetMediaVideoVariant {
    return buildFromObject(TweetMediaVideoVariant, object)
      .string('url', false)
      .string('content_type', false)
      .num('bitrate', false)
      .orThrow(message => new Error(`Could not build TweetMediaVideoVariant: ${message}`));
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly url?: string,
    public readonly contentType?: string,
    public readonly bitrate?: number,
  ) {
  }
}

export class TweetMediaVideo {
  public static fromObject(object: {}): TweetMediaVideo {
    return buildFromObject(TweetMediaVideo, object)
      .list('aspect_ratio', 'number', false)
      .list('variants', TweetMediaVideoVariant, false)
      .num('duration_millis', false)
      .orThrow(message => new Error(`Could not build TweetMediaVideo: ${message}`));
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly aspectRatio?: number[],
    public readonly variants?: TweetMediaVideoVariant[],
    public readonly durationMs?: number,
  ) {
  }
}

export class TweetMedia implements Indexed {
  static readonly ANIMATED_GIF = 'animated_gif';
  static readonly PHOTO = 'photo';
  static readonly VIDEO = 'video';
  static readonly VIDEO_MP4 = 'video/mp4';

  public static fromObject(object: {}): TweetMedia {
    return buildFromObject(TweetMedia, object)
      .scalar(['id_str', 'id'], null)
      .string(['media_url_https', 'media_url'])
      .string('type')
      .list('indices', 'number')
      .obj('sizes', TweetMediaSizes, false)
      .string('display_url', false)
      .string('expanded_url', false)
      .string('url', false)
      .obj('video_info', TweetMediaVideo, false)
      .scalar(['source_status_id_str', 'source_status_id'], null, false)
      .orThrow(message => new Error(`Could not build TweetMedia: ${message}`));
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly id: any,
    public readonly url: string,
    public readonly type: 'photo' | 'video' | 'animated_gif',
    public readonly indices: number[],
    public readonly sizes?: TweetMediaSizes,
    public readonly displayUrl?: string,
    public readonly expandedUrl?: string,
    public readonly shortUrl?: string,
    public readonly videoInfo?: TweetMediaVideo,
    public readonly sourceTweetId?: any,
  ) {
  }
}
