import {expect} from 'chai';
import {describe, it} from 'mocha';
import {MediaExtractor} from "../../type/slack/extractor/MediaExtractor";
import {MediaTranscoder} from "../../type/aphelocoma/MediaTranscoder";
import {TweetMedia} from "../../type/twitter/TweetMedia";
import {DelayedRenderActions} from "../../type/slack/SlackTweetFormatter";
import {PostableMessage} from "../../type/slack/PostableMessage";
import {KnownBlockable} from "../../type/slack/block/SlackBlock";

describe('MediaExtractor', () => {
  class TestableMediaTranscoder implements MediaTranscoder {
    public lastVideoUri?: string;
    public nextResult?: string;
    public doThrow: boolean = false;

    async attemptTranscode(videoUri: string): Promise<string> {
      this.lastVideoUri = videoUri;
      if (this.doThrow) {
        throw new Error('Transcode failure!');
      }
      return this.nextResult == null ? videoUri : this.nextResult;
    }
  }

  class TestableDelayedRenderActions implements DelayedRenderActions {
    public readonly blocks: KnownBlockable[] = [];
    public readonly messages: PostableMessage[] = [];

    addBlock(block: KnownBlockable): void {
      this.blocks.push(block);
    }

    addMessage(message: PostableMessage): void {
      this.messages.push(message);
    }
  }

  interface TestContext {
    delayed: TestableDelayedRenderActions,
    extractor: MediaExtractor,
    transcoder: TestableMediaTranscoder,
  }

  function buildContext(): TestContext {
    const delayed = new TestableDelayedRenderActions();
    const transcoder = new TestableMediaTranscoder();
    const extractor = new MediaExtractor(transcoder);
    return {delayed, extractor, transcoder};
  }

  const videoUri = 'some video uri';
  const gifUri = 'some gif uri';
  const media: TweetMedia = {
    id: 1234,
    url: 'media url',
    type: 'video',
    indices: [],
    videoInfo: {
      variants: [
        {
          url: videoUri,
          bitrate: 1234,
          contentType: TweetMedia.VIDEO_MP4
        },
        {
          url: gifUri,
          bitrate: 5678,
          contentType: TweetMedia.ANIMATED_GIF
        }
      ]
    }
  };

  it('should try to transcode videos', async () => {
    const test = buildContext();
    test.transcoder.nextResult = 'some gif uri';
    const md = await test.extractor.convert(media, undefined, test.delayed);
    expect(md).equals(`<${gifUri}>`);
    expect(test.transcoder.lastVideoUri).equals(videoUri);
    expect(test.delayed.blocks).is.empty;
    expect(test.delayed.messages).deep.equals([
      PostableMessage.fromText(`<${test.transcoder.nextResult}>`)
    ]);
  });

  it('should catch errors', async () => {
    const test = buildContext();
    test.transcoder.doThrow = true;
    const md = await test.extractor.convert(media, undefined, test.delayed);
    expect(md).equals(`<${videoUri}>`);
    expect(test.transcoder.lastVideoUri).equals(videoUri);
    expect(test.delayed.blocks).is.empty;
    expect(test.delayed.messages).deep.equals([
      PostableMessage.fromText(`<${videoUri}>`)
    ]);
  });
});
