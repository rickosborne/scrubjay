import {EntityExtractor} from './EntityExtractor';
import {TweetMedia} from '../../twitter/TweetMedia';
import {TweetEntities} from '../../twitter/TweetEntities';
import {DelayedRenderActions, TweetRenderingFlags} from '../SlackTweetFormatter';
import {PostableMessage} from '../PostableMessage';
import {MediaTranscoder} from '../../aphelocoma/MediaTranscoder';

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
      const best = item.videoInfo.variants
        .filter(variant => variant != null
          && variant.url != null
          && variant.bitrate != null
          && variant.contentType === TweetMedia.VIDEO_MP4)
        .reduce((left, right) => left == null ? right : right == null ? left : (left.bitrate || 0) > (right.bitrate || 0) ? left : right);
      if (best != null && best.url != null && later != null) {
        let url: string = best.url;
        try {
          url = await this.mediaTranscoder.attemptTranscode(best.url.replace(/\?tag=\d+$/, ''));
        } catch (e) {
        }
        later.addMessage(PostableMessage.fromText(`<${url}>`));
      }
    } else if (item.url != null && later != null) {
      later.addMessage(PostableMessage.fromText(`<${item.url}>`));
    }
    return item.displayUrl == null ? `<${item.url}>` : `<${item.url}|${item.displayUrl}>`;
  }

  originalText(item: TweetMedia): string {
    return item.url;
  }
}
