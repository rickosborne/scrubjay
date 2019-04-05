import * as slack from '@slack/client';
import {SlackId, SlackTimestamp} from './RTEvent';

export class PostableMessage implements slack.ChatPostMessageArguments {
  static fromBlocks(blocks: slack.KnownBlock[], text: string, channel?: SlackId, thread?: SlackTimestamp): PostableMessage {
    return new PostableMessage(text, channel, thread, blocks);
  }

  static fromText(text: string, channel?: SlackId, thread?: SlackTimestamp): PostableMessage {
    return new PostableMessage(text, channel, thread);
  }

  constructor(
    public readonly text: string,
    private _channel?: SlackId,
    public readonly thread_ts?: SlackTimestamp,
    public readonly blocks?: slack.KnownBlock[],
    public readonly attachments?: slack.MessageAttachment[],
  ) {
  }

  get channel(): string {
    if (this._channel == null) {
      throw new Error(`PostableMessage with unresolved channel: ${this}`);
    }
    return this._channel;
  }

  toString(): string {
    return JSON.stringify(this, null, 2);
  }

  with(channelId?: SlackId, thread?: SlackTimestamp): PostableMessage {
    return new PostableMessage(this.text, channelId || this._channel, thread || this.thread_ts, this.blocks, this.attachments);
  }
}
