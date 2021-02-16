import {EntityExtractor} from './EntityExtractor';
import {TweetMedia, TweetMediaVideoVariant} from '../../twitter/TweetMedia';
import {TweetEntities} from '../../twitter/TweetEntities';
import {DelayedRenderActions, TweetRenderingFlags} from '../SlackTweetFormatter';
import {PostableMessage} from '../PostableMessage';
import {MediaTranscoder} from '../../aphelocoma/MediaTranscoder';

const BITRATE_SOFT_CAP = 400000;
const BITRATE_HARD_CAP = 800000;

export class MediaExtractor implements EntityExtractor<TweetMedia> {
  public readonly pad = true;

  constructor(
    private readonly mediaTranscoder: MediaTranscoder
  ) {
  }

  access(entities: TweetEntities): TweetMedia[] | null | undefined {
    return entities.media;
  }

  bestForGif(left: TweetMediaVideoVariant | undefined, right: TweetMediaVideoVariant | undefined): TweetMediaVideoVariant | undefined {
    if (left == null) {
      return right;
    }
    if (right == null) {
      return left;
    }
    const leftBitrate = left.bitrate || 0;
    const rightBitrate = right.bitrate || 0;
    if (leftBitrate > BITRATE_HARD_CAP && rightBitrate > BITRATE_HARD_CAP) {  // both too big, give up!
      return undefined;
    } else if (leftBitrate > BITRATE_HARD_CAP) {  // left too big
      return right;
    } else if (rightBitrate > BITRATE_HARD_CAP) {  // right too big
      return left;
    } else if (leftBitrate > BITRATE_SOFT_CAP && rightBitrate > BITRATE_SOFT_CAP) {  // both bigger than preferred, use smaller
      return leftBitrate > rightBitrate ? right : left;
    } else {  // both acceptable, use larger
      return leftBitrate > rightBitrate ? left : right;
    }
  }

  bestForMp4(left: TweetMediaVideoVariant, right: TweetMediaVideoVariant): TweetMediaVideoVariant {
    if (left == null) {
      return right;
    }
    if (right == null) {
      return left;
    }
    const leftBitrate = left.bitrate || 0;
    const rightBitrate = right.bitrate || 0;
    return leftBitrate > rightBitrate ? left : right;
  }

  async convert(item: TweetMedia, flags?: TweetRenderingFlags, later?: DelayedRenderActions): Promise<string> {
    let url: string | undefined = item.url;
    if (item.videoInfo != null && item.videoInfo.variants != null) {
      const mp4s = item.videoInfo.variants
        .filter(variant => variant != null
          && variant.url != null
          && variant.bitrate != null
          // && variant.bitrate > 0
          && variant.contentType === TweetMedia.VIDEO_MP4);
      if (mp4s.length > 0) {
        const bestGif = mp4s
          .reduce((a: TweetMediaVideoVariant | undefined, b: TweetMediaVideoVariant | undefined) => this.bestForGif(a, b), undefined);
        const bestMp4 = mp4s.reduce((a, b) => this.bestForMp4(a, b));
        if (bestMp4 != null && bestMp4.url != null) {
          url = bestMp4.url;
        }
        if (bestGif != null && bestGif.url != null && later != null) {
          try {
            const gifUrl = await this.mediaTranscoder
              .attemptTranscode(bestGif.url.replace(/\?tag=\d+$/, ''));
            if (gifUrl != null) {
              url = gifUrl;
            }
          } catch (e) {
            // don't care
          }
        }
      }
    }
    if (url != null && later != null) {
      later.addMessage(PostableMessage.fromText(`<${url}>`));
    }
    return item.displayUrl == null ? `<${url}>` : `<${url}|${item.displayUrl}>`;
  }

  originalText(item: TweetMedia): string {
    return item.url;
  }
}
