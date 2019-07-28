import * as slack from '@slack/web-api';
import {SlackId, SlackTimestamp} from './RTEvent';

export class PostableMessage implements slack.ChatPostMessageArguments {
  [argument: string]: unknown;

  static fromBlocks(blocks: slack.KnownBlock[], text: string, channel?: SlackId, thread?: SlackTimestamp): PostableMessage {
    return new PostableMessage(text, channel || '', thread, blocks);
  }

  static fromText(text: string, channel?: SlackId, thread?: SlackTimestamp): PostableMessage {
    return new PostableMessage(text, channel || '', thread);
  }

  constructor(
    public readonly text: string,
    public readonly channel: SlackId,
    public readonly thread_ts?: SlackTimestamp,
    public readonly blocks?: slack.KnownBlock[],
    public readonly attachments?: slack.MessageAttachment[],
  ) {
  }

  toString(): string {
    return JSON.stringify(this, null, 2);
  }

  with(channelId?: SlackId, thread?: SlackTimestamp): PostableMessage {
    return new PostableMessage(this.text, channelId || this.channel, thread || this.thread_ts, this.blocks, this.attachments);
  }
}
