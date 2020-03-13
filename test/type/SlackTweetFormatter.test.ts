import {expect} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import {DelayedRenderActions, SlackTweetFormatter, TweetRenderingFlags} from '../../type/slack/SlackTweetFormatter';
import {Chunk, SlackTweetFormatterImpl} from '../../type/slack/SlackTweetFormatter.impl';
import {extendedTweetWithVideoJson} from '../fixture/extendedTweetWithVideo';
import {tweetWithBrokenLinkReplacementJson} from '../fixture/tweetWithBrokenLinkReplacement';
import {tweetQuotedWithEmojisJson} from '../fixture/tweetQuotedWithEmojis';
import {tweetWithTrailingHashtagJson} from '../fixture/tweetWithTrailingHashtag';
import {tweetWithVideoJson} from '../fixture/tweetWithVideo';
import {failingTweet1Json} from '../fixture/failingTweet1';
import {TweetEntities} from '../../type/twitter/TweetEntities';
import {Tweet} from '../../type/twitter/Tweet';
import {PostableMessage} from '../../type/slack/PostableMessage';
import {KnownBlockable} from '../../type/slack/block/SlackBlock';
import {ImageElement, MrkdwnElement, PlainTextElement} from '@slack/types';
import {MediaTranscoder} from "../../type/aphelocoma/MediaTranscoder";

const tweetQuotedWithEmojis: Tweet = Tweet.fromObject(tweetQuotedWithEmojisJson);
const tweetWithVideo: Tweet = Tweet.fromObject(tweetWithVideoJson);
const extendedTweetWithVideo: Tweet = Tweet.fromObject(extendedTweetWithVideoJson);
const tweetWithBrokenLinkReplacement: Tweet = Tweet.fromObject(tweetWithBrokenLinkReplacementJson);
const tweetWithTrailingHashtag: Tweet = Tweet.fromObject(tweetWithTrailingHashtagJson);
const failingTweet1: Tweet = Tweet.fromObject(failingTweet1Json);

describe('SlackTweetFormatter', () => {
  class TestableMediaTranscoder implements MediaTranscoder {
    async attemptTranscode(videoUri: string): Promise<string> {
      // console.log(`Would try to transcode ${videoUri}`)
      return videoUri;
    }
  }

  class TestableSlackTweetFormatter extends SlackTweetFormatterImpl {
    constructor() {
      super(new TestableMediaTranscoder());
    }

    public async chunksForEntities(
      entities: TweetEntities,
      flags: TweetRenderingFlags,
      later: DelayedRenderActions
    ): Promise<Chunk[]> {
      return await super.chunksForEntities(entities, flags, later);
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
              block.elements.forEach((element: ImageElement | PlainTextElement | MrkdwnElement) => {
                switch (element.type) {
                  case 'mrkdwn':
                    texts.push(element.text);
                    break;
                  case 'plain_text':
                    texts.push(element.text);
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
              break;
            default:
              throw new Error(`Unhandled block type: ${block.type}`);
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

  // describe('getInstance', () => {
  //   it('is not null', () => {
  //     const instance = SlackTweetFormatter.getInstance();
  //     expect(instance).is.instanceOf(SlackTweetFormatterImpl);
  //   });
  // });

  describe('messagesFromTweet', () => {
    it('handles embedded pics', async () => {
      const formatter = new TestableSlackTweetFormatter();
      const messages = await formatter.messagesFromTweet(tweetQuotedWithEmojis);
      const texts = textsFromMessages(messages);
      expect(texts).deep.equals([
        "*<https://twitter.com/Marisha_Ray|:bird:Marisha_Ray>* (Marisha Ray):\n?\n>Quoted *<https://twitter.com/quortknee|:bird:quortknee>* (courtney?):\n>Finished up my _#CriticalRoleRedraw_ ! Left is from 2019, right is from 2016! ?\n>Keyleth is still extremely important to me, I will always be thankful to <https://twitter.com/Marisha_Ray|:bird:Marisha_Ray> for creating such a wonderful character.  Much love ♥️ _#CriticalRole_ _#criticalrolefanart_ <https://pbs.twimg.com/media/D16eukOUwAIn9bN.jpg|pic.twitter.com/7oU8eLD41B> <https://pbs.twimg.com/media/D16e4ejVYAIDorp.jpg|pic.twitter.com/7oU8eLD41B>",
        "<https://pbs.twimg.com/media/D16eukOUwAIn9bN.jpg>",
        "<https://pbs.twimg.com/media/D16e4ejVYAIDorp.jpg>",
      ]);
    });
    it('handles embedded videos', async () => {
      const formatter = new TestableSlackTweetFormatter();
      const messages: PostableMessage[] = await formatter.messagesFromTweet(tweetWithVideo);
      const texts = textsFromMessages(messages);
      expect(texts).deep.equals([
        "*<https://twitter.com/CriticalRole|:bird:CriticalRole>* (Critical Role):\n\"You don't have to be in something forever for it to have a lasting impression on your life.\" - <https://twitter.com/MaryEMcGlynn|:bird:MaryEMcGlynn>\n\nZahra Hydris herself joins <https://twitter.com/BrianWFoster|:bird:BrianWFoster> tonight for an all-new episode of _#BetweenTheSheets_! Live at 7pm Pacific on <http://twitch.tv/criticalrole|twitch.tv/criticalrole>. <https://pbs.twimg.com/ext_tw_video_thumb/1107678595399311360/pu/img/x3Ne8V8lErWowNTB.jpg|pic.twitter.com/6f25qmC9z4>",
        "<https://video.twimg.com/ext_tw_video/1107678595399311360/pu/vid/320x180/gMW6lxCjMTyAdPvN.mp4>",
      ]);
    });
    it('handles extended embedded videos', async () => {
      const formatter = new TestableSlackTweetFormatter();
      const messages: PostableMessage[] = await formatter.messagesFromTweet(extendedTweetWithVideo);
      const texts = textsFromMessages(messages);
      expect(texts).deep.equals([
        "*<https://twitter.com/WillingBlam|:bird:WillingBlam>* (Travis Willingham) retweeted:\n>*<https://twitter.com/SportsCenter|:bird:SportsCenter>* (SportsCenter):\n>Hug someone you love today.\n>\n>Well said, @RealJayWilliams. <https://pbs.twimg.com/ext_tw_video_thumb/1221545008563658753/pu/img/FRHF8stNwR8FN05-.jpg|pic.twitter.com/m9WnfP3sWn>",
        "<https://video.twimg.com/ext_tw_video/1221545008563658753/pu/vid/480x270/HkEyKBvQzPPBMHiI.mp4>",
      ]);
    });
    it('correctly replaces links', async () => {
      const formatter = new TestableSlackTweetFormatter();
      const messages: PostableMessage[] = await formatter.messagesFromTweet(tweetWithBrokenLinkReplacement);
      const texts = textsFromMessages(messages);
      expect(texts).deep.equals([
        "*<https://twitter.com/VoiceOfOBrien|:bird:VoiceOfOBrien>* (Liam O'Brien) retweeted:\n>*<https://twitter.com/marcorubio|:bird:marcorubio>* (Marco Rubio):\n>I know John Bolton well, he is an excellent choice who will do an great job as National Security Advisor. General McMaster has served and will continue to serve our nation well. We should all be grateful to him for his service.",
      ]);
    });
    it('does not duplicate trailing hashtags', async () => {
      const formatter = new TestableSlackTweetFormatter();
      const messages: PostableMessage[] = await formatter.messagesFromTweet(tweetWithTrailingHashtag);
      const texts = textsFromMessages(messages);
      expect(texts).deep.equals([
        "*<https://twitter.com/ChaiKovsky|:bird:ChaiKovsky>* (Sam de Leve) retweeted:\n>*<https://twitter.com/Xanderrific|:bird:Xanderrific>* (Xander Jeanneret):\n>Friends! I’m going to be doing something a little different today: I’ll be playing <https://twitter.com/trekonlinegame|:bird:trekonlinegame> (PC) today at 1:00pm PT! Feel free to join me, along with the _#Fannerets_ over at <http://twitch.tv/xanderrific|twitch.tv/xanderrific> (I’ll still be playing Pokémon in the future!) _#ClearSkiesRPG_"
      ]);
    });
  });

  it('formats the failing tweet', async () => {
    const formatter = new TestableSlackTweetFormatter();
    const messages = await formatter.messagesFromTweet(failingTweet1);
    const texts = textsFromMessages(messages);
    expect(texts).to.deep.equal([
      "*<https://twitter.com/PocketGina|:bird:PocketGina>* (Gina DeVivo):\nWOOOOOOO\n>Quoted *<https://twitter.com/DiMRPG|:bird:DiMRPG>* (Descent Into Midnight):\n>We’ve hit our first stretch goal! Every backer gets the _#DiMRPG_ inspired coloring book PDF, plus a One Shot of DiM played by the incredible _#Streampunks_! At $35,000, we unlock an additional ep, printable Corruption/Harmony tokens, and files for 3D printer &amp; laser cutter tokens! <https://pbs.twimg.com/media/ERCjEA-UcAA9dF9.jpg|pic.twitter.com/xE1kpAjhrr> <https://pbs.twimg.com/media/ERCjEA-U8AEuB-R.jpg|pic.twitter.com/xE1kpAjhrr> <https://pbs.twimg.com/media/ERCjEA-U0AAAzoA.jpg|pic.twitter.com/xE1kpAjhrr>",
      "<https://pbs.twimg.com/media/ERCjEA-UcAA9dF9.jpg>",
      "<https://pbs.twimg.com/media/ERCjEA-U8AEuB-R.jpg>",
      "<https://pbs.twimg.com/media/ERCjEA-U0AAAzoA.jpg>",
    ]);
  });
});
