import * as slack from '@slack/client';
import {RTMClient, WebClient} from '@slack/client';
import {config, SlackConfig} from '../Config';
import env from '../../lib/env';
import {RTMConnectResult} from './RTMConnectResult';
import {DirectMessage} from './DirectMessage';
import {SlackId, SlackTimestamp} from './RTEvent';
import {trim} from '../../lib/trim';
import {Channel} from './Channel';
import {WebChannelsListResult} from './WebChannelsListResult';
import {MessageAttachment} from '@slack/client';

interface OnMessageActions {
  channel(name: string): Promise<Channel>;

  commandsLike(text: string): { path: string; helpText: string }[];

  reply(...messages: PostableMessage[]): Promise<void>;

  typing(): this;
}

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

type MaybePromise<T> = T | Promise<T>;
type FromMessage<T> = (message: DirectMessage, actions: OnMessageActions, ...parts: string[]) => MaybePromise<T>;
type OnSlackMessage = FromMessage<boolean | void>;
type Eventually<T> = MaybePromise<T> | FromMessage<T>;
export type Postable = string | PostableMessage | PostableMessage[];
export type EventuallyPostable = Eventually<Postable>;

function regexify(stringOrPattern: string | RegExp): RegExp {
  return stringOrPattern instanceof RegExp ? stringOrPattern : new RegExp(stringOrPattern, 'i');
}

export class Command {

  static readonly SPLAT = /(?:(\S+)\s*)*/g;
  public readonly children: Command[] = [];

  constructor(
    public readonly client: SlackClient,
    public readonly literal: string,
    public readonly paramName: string,
    public readonly pattern: RegExp,
    public readonly helpText?: string,
    public readonly parent: Command = null,
  ) {
  }

  get matcher(): RegExp {
    const fromParent = (this.parent == null ? '^' : (this.parent.matcher.source + '\\s+'));
    const thisPattern = this.literal != null ? this.literal
      : this.paramName != null ? ('(?<' + this.paramName + '>\\S+)')
        : this.pattern.source;
    return new RegExp(fromParent + thisPattern, 'i');
  }

  get path(): string {
    return (this.parent == null ? '' : (this.parent.path + ' '))
      + (this.literal
        || (this.paramName == null ? null : '$' + this.paramName)
        || (this.pattern === Command.SPLAT ? '...' : this.pattern.source));
  }

  public param(name: string, helpText: string = null, callback: (subcommand: Command) => void): this {
    const command = new Command(this.client, null, name, null, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }

  public reply(eventually: EventuallyPostable, thread: boolean = false): this {
    this.client.replyTo(this.matcher, eventually, thread);
    return this;
  }

  public rest(helpText: string = null, callback: (subcommand: Command) => void): this {
    const command = new Command(this.client, null, null, Command.SPLAT, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }

  public subcommand(name: string, helpText: string = null, callback: (subcommand: Command) => void): this {
    const command = new Command(this.client, name, null, null, helpText, this);
    this.children.push(command);
    callback(command);
    return this;
  }
}

export class SlackClient {

  private readonly commands: Command[] = [];
  private readonly oauth: string;
  private readonly onMessageCallbacks: OnSlackMessage[] = [];
  private rtm: RTMClient = null;
  private readonly web: WebClient;

  constructor(cfg: SlackConfig) {
    this.oauth = cfg.botOAuth;
    this.web = new WebClient(this.oauth);
  }

  public command(key: string | RegExp, helpText: string = null, callback?: (command: Command) => void): this {
    const command = new Command(this, typeof key === 'string' ? key : null, null, key instanceof RegExp ? key : null, helpText);
    this.commands.push(command);
    callback(command);
    return this;
  }

  public help(key: string | RegExp): this {
    const lines: string[] = ['I know the following commands:'];

    function addHelp(command: Command) {
      if (command.helpText != null) {
        lines.push(`\`${command.path}\`  ${command.helpText}`);
      }
      command.children.forEach(addHelp);
    }

    this.commands.forEach(addHelp);
    this.replyTo(regexify(key), lines.join('\n'));
    return this;
  }

  private messageActions(message: DirectMessage): OnMessageActions {
    const self = this;
    return {
      commandsLike: text => {
        const words = text.split(/\s+/g);
        const results = [];
        for (const command of self.commands) {
          const path = command.path;
          const helpText = command.helpText;
          for (const word of words) {
            if (helpText != null && path.indexOf(word) >= 0 && results.indexOf(path) < 0) {
              results.push({path, helpText});
            }
          }
        }
        return results;
      },
      reply: (...replies: PostableMessage[]) => {
        return this.send(...replies);
      },
      channel(name: string): Promise<Channel> {
        const simpleName = name.replace(/^#/, '').toLowerCase();
        return self.web.conversations.list({
          types: 'public_channel,private_channel',
          token: self.oauth
        }).then((result: WebChannelsListResult) => {
          if (result.ok) {
            return result.channels.filter(channel => simpleName === channel.name.toLowerCase()).shift();
          }
          return null;
        });
      },
      typing() {
        self.rtm.sendTyping(message.channel).catch(reason => env.debug(`Could not send typing: ${JSON.stringify(reason)}`));
        return this;
      }
    };
  }

  private messageHandler(message: DirectMessage): void {
    const subtype: string = message.subtype || '';
    if (['bot_message', 'message_changed'].indexOf(subtype) >= 0 || (!message.subtype && message.user === this.rtm.activeUserId)) {
      return;
    }
    env.debug(() => message);
    for (const callback of this.onMessageCallbacks) {
      const result = callback(message, this.messageActions(message));
      if (result === true) {
        break;
      }
    }
  }

  public onMessage(callback: OnSlackMessage): this {
    this.onMessageCallbacks.push(callback);
    return this;
  }

  public onMessageMatch(regex: RegExp, callback: OnSlackMessage): this {
    this.onMessage(message => {
      const matches = regex.exec(trim(message.text));
      if (matches != null) {
        const groups = matches.slice(1);
        callback(message, this.messageActions(message), ...groups);
        return true;
      }
    });
    return this;
  }

  public otherwise(messageSupplier: EventuallyPostable): this {
    this.onMessage(this.replier(messageSupplier));
    return this;
  }

  private replier(messageSupplier: EventuallyPostable, thread: boolean = false): OnSlackMessage {
    return (message, actions, ...args) => {
      this.resolve(messageSupplier, message, ...args).then(text => {
        if (text != null) {
          actions.reply(...this.toPostables(text, message.channel, thread ? message.ts : undefined))
            .catch(reason => env.debug(() => `Could not deliver reply: ${reason}`));
        }
      });
    };
  }

  public replyTo(regex: RegExp, messageSupplier: EventuallyPostable, thread: boolean = false): this {
    this.onMessageMatch(regex, this.replier(messageSupplier, thread));
    return this;
  }

  private resolve<T>(s: Eventually<T>, message: DirectMessage, ...args: string[]): Promise<T | null> {
    let result: Eventually<T> = s;
    do {
      if (result instanceof Promise) {
        return result;
      }
      if (typeof result === 'function') {
        result = (<FromMessage<T>>result)(message, this.messageActions(message), ...args);
        continue;
      }
      return Promise.resolve(<T>result);
    } while (true);
  }

  public send(...messages: PostableMessage[]): Promise<void> {
    return Promise
      .all(messages.map((message, index) => new Promise(resolve => {
          env.debug(() => message.toString());
          setTimeout(() => this.web.chat.postMessage(message).then(r => resolve(r)), index * 250);
        })
      ))
      .then(() => null)
      .catch(err => {
        const jsonError = JSON.stringify(err, null, 2);
        const jsonText = JSON.stringify(messages, null, 2);
        env.debug(() => `Could not send: ${jsonError}\n${jsonText}`, err instanceof Error ? err : null);
      });
  }

  public start(): Promise<void> {
    if (this.rtm != null) {
      (async () => await this.rtm.disconnect())();
      this.rtm = null;
    }
    this.rtm = new RTMClient(this.oauth);
    this.rtm.on('message', this.messageHandler.bind(this));
    return new Promise((resolve, reject) => {
      this.rtm.start().then((rtmResult: RTMConnectResult) => {
        env.debug(() => rtmResult);
        if (!rtmResult.ok) {
          reject(`Could not connect to RTM`);
          return;
        }
        resolve();
      }).catch(reason => reject(reason));
    });
  }

  private toPostables(eventually: Postable, channel?: SlackId, ts?: SlackTimestamp): PostableMessage[] {
    if (eventually instanceof PostableMessage) {
      return [eventually.with(channel, ts)];
    }
    if (typeof eventually === 'string') {
      return [PostableMessage.from(eventually, channel, ts)];
    }
    if (Array.isArray(eventually)) {
      return eventually.map(e => e.with(channel, ts));
    }
    return [];
  }
}

export const slackClient = new SlackClient(config.slack);
