import * as slack from '@slack/client';
import {MessageAttachment} from '@slack/client';
import {SlackId, SlackTimestamp} from './RTEvent';

export class PostableMessage implements slack.ChatPostMessageArguments {
  static from(object: string | slack.KnownBlock[] | PostableMessage, channel?: SlackId, thread?: SlackTimestamp): PostableMessage | null {
    if (object instanceof PostableMessage) {
      return object;
    }
    if (typeof object === 'string') {
      return new PostableMessage(channel, thread, object);
    }
    if (Array.isArray(object)) {
      return new PostableMessage(channel, thread, undefined, object);
    }
    return null;
  }

  // noinspection JSUnusedGlobalSymbols
  constructor(
    public readonly channel: SlackId,
    public readonly thread_ts: SlackTimestamp,
    public readonly text: string,
    public readonly blocks?: slack.KnownBlock[],
    public readonly attachments?: MessageAttachment[],
  ) {
  }

  toString(): string {
    return JSON.stringify(this, null, 2);
  }

  with(channelId: SlackId, thread?: SlackTimestamp): PostableMessage {
    return new PostableMessage(channelId || this.channel, thread || this.thread_ts, this.text, this.blocks, this.attachments);
  }

  withText(text: string) {
    return new PostableMessage(this.channel, this.thread_ts, text || this.text, this.blocks, this.attachments);
  }
}
