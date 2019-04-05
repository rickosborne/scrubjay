import {expect} from 'chai';
import {describe, it, beforeEach} from 'mocha';
import {DelayedRenderActions, SlackTweetFormatter, TweetRenderingFlags} from '../../type/slack/SlackTweetFormatter';
import {Chunk, SlackTweetFormatterImpl} from '../../type/slack/SlackTweetFormatter.impl';
import {tweetQuotedWithEmojisJson} from '../fixture/tweetQuotedWithEmojis';
import {tweetWithVideoJson} from '../fixture/tweetWithVideo';
import {TweetEntities} from '../../type/twitter/TweetEntities';
import {Tweet} from '../../type/twitter/Tweet';
import {PostableMessage} from '../../type/slack/PostableMessage';
import {KnownBlockable} from '../../type/slack/block/SlackBlock';

const tweetQuotedWithEmojis: Tweet = Tweet.fromObject(tweetQuotedWithEmojisJson);
const tweetWithVideo: Tweet = Tweet.fromObject(tweetWithVideoJson);

describe('SlackTweetFormatter', () => {
  class TestableSlackTweetFormatter extends SlackTweetFormatterImpl {
    public chunksForEntities(entities: TweetEntities, flags: TweetRenderingFlags, later: DelayedRenderActions): Chunk[] {
      return super.chunksForEntities(entities, flags, later);
    }

    public replaceChunks(sparseChunks: Chunk[], originalText: string, flags: TweetRenderingFlags): string {
      return super.replaceChunks(sparseChunks, originalText, flags);
    }
  }

  const addedMessages: PostableMessage[] = [];
  const addedBlocks: KnownBlockable[] = [];

  function textsFromMessages(messages: PostableMessage[]): string[] {
    const texts: string[] = [];
    messages.forEach(message => {
      if (Array.isArray(message.blocks) && message.blocks.length > 0) {
        message.blocks.forEach(block => {
          switch (block.type) {
            case 'image':
              texts.push(`<${block.image_url}>`);
              break;
            case 'divider':
              texts.push('<hr>');
              break;
            case 'actions':
              break;
            case 'context':
              block.elements.forEach(element => {
                switch (element.type) {
                  case 'mrkdwn':
                    texts.push(element.text);
                    break;
                  case 'plain_text':
                    texts.push(element.text);
                    break;
                  case 'user':
                    texts.push(element.user_id);
                    break;
                  case 'image':
                    texts.push(`<${element.image_url}|${element.alt_text}>`);
                    break;
                }
              });
              break;
            case 'section':
              if (block.text != null) {
                texts.push(block.text.text);
              }
          }
        });
      } else {
        texts.push(message.text);
      }
    });
    return texts;
  }

  beforeEach(() => {
    addedMessages.splice(0, addedMessages.length);
    addedBlocks.splice(0, addedBlocks.length);
  });

  describe('getInstance', () => {
    it('is not null', () => {
      const instance = SlackTweetFormatter.getInstance();
      expect(instance).is.instanceOf(SlackTweetFormatterImpl);
    });
  });

  describe('messagesFromTweet', () => {
    it('handles embedded pics', () => {
      const formatter = new TestableSlackTweetFormatter();
      const messages: string[] = formatter.messagesFromTweet(tweetQuotedWithEmojis).map(message => message.text);
      expect(messages[0]).equals(`@Marisha_Ray: ?`);
      expect(messages[1]).equals('<https://pbs.twimg.com/media/D16eukOUwAIn9bN.jpg>');
      expect(messages[2]).equals('<https://pbs.twimg.com/media/D16e4ejVYAIDorp.jpg>');
    });
    it('handles embedded videos', () => {
      const formatter = new TestableSlackTweetFormatter();
      const messages: PostableMessage[] = formatter.messagesFromTweet(tweetWithVideo);
      const texts = textsFromMessages(messages);
      expect(texts[1]).equals('<https://video.twimg.com/ext_tw_video/1107678595399311360/pu/vid/1280x720/vjCA_MjX5ZjWj8pX.mp4?tag=8>');
    });
  });
});
