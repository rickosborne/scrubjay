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

  async convert(item: TweetMedia, flags?: TweetRenderingFlags, later?: DelayedRenderActions): Promise<string> {
    if (item.videoInfo != null && item.videoInfo.variants != null) {
      const mp4s = item.videoInfo.variants
        .filter(variant => variant != null
          && variant.url != null
          && variant.bitrate != null
          && variant.contentType === TweetMedia.VIDEO_MP4);
      const bestGif = mp4s
        .reduce((a: TweetMediaVideoVariant | undefined, b: TweetMediaVideoVariant | undefined) => this.bestForGif(a, b), undefined);
      const bestMp4 = mp4s.reduce((a, b) => this.bestForMp4(a, b));
      if (bestGif != null && bestGif.url != null && later != null) {
        let url: string = bestGif.url;
        try {
          url = await this.mediaTranscoder.attemptTranscode(bestGif.url.replace(/\?tag=\d+$/, ''));
          later.addMessage(PostableMessage.fromText(`<${url}>`));
        } catch (e) {
          if (bestMp4 != null) {
            later.addMessage(PostableMessage.fromText(`<${bestMp4.url}>`));
          } else {
            later.addMessage(PostableMessage.fromText(`<${item.url}>`));
          }
        }
      }
    } else if (item.url != null && later != null) {
      later.addMessage(PostableMessage.fromText(`<${item.url}>`));
    }
    return item.displayUrl == null ? `<${item.url}>` : `<${item.url}|${item.displayUrl}>`;
  }

  bestForMp4(left: TweetMediaVideoVariant, right: TweetMediaVideoVariant): TweetMediaVideoVariant {
    if (left == null) return right;
    if (right == null) return left;
    const leftBitrate = left.bitrate || 0;
    const rightBitrate = right.bitrate || 0;
    return leftBitrate > rightBitrate ? left : right;
  }

  bestForGif(left: TweetMediaVideoVariant | undefined, right: TweetMediaVideoVariant | undefined): TweetMediaVideoVariant | undefined {
    if (left == null) return right;
    if (right == null) return left;
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

  originalText(item: TweetMedia): string {
    return item.url;
  }
}
