import {RTMClient, WebClient} from '@slack/client';
import {config, SlackConfig} from '../Config';
import env from '../../lib/env';
import {RTMConnectResult} from './RTMConnectResult';
import {DirectMessage} from './DirectMessage';
import {SlackId, SlackTimestamp} from './RTEvent';
import {trim} from '../../lib/trim';
import {FeedChannel, slackFeedStore} from './FeedStore';
import {Channel} from './Channel';
import {WebChannelsListResult} from './WebChannelsListResult';

interface OnMessageActions {
  channel(name: string): Promise<Channel>;

  reply(text: string, thread?: boolean): Promise<void>;

  typing(): this;
}

type OnSlackMessage = (message: DirectMessage, actions: OnMessageActions, ...parts: string[]) => boolean | void;
type StringFromMessage = (message: DirectMessage, actions: OnMessageActions, ...parts: string[]) => string | Promise<string>;
type EventuallyString = string | StringFromMessage | Promise<string>;

function regexify(stringOrPattern: string | RegExp): RegExp {
  return stringOrPattern instanceof RegExp ? stringOrPattern : new RegExp(stringOrPattern, 'i');
}

export class Command {
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
    return (this.parent == null ? '' : (this.parent.path + ' ')) + (this.literal || ('$' + this.paramName));
  }

  public endCommand(): SlackClient {
    return this.client;
  }

  public endParam(): Command {
    return this.parent;
  }

  public endSubcommand(): Command {
    return this.parent;
  }

  public param(name: string, helpText?: string): Command {
    const command = new Command(this.client, null, name, null, helpText, this);
    this.children.push(command);
    return command;
  }

  public reply(eventuallyString: EventuallyString, thread: boolean = false): this {
    this.client.replyTo(this.matcher, eventuallyString, thread);
    return this;
  }

  public subcommand(name: string, helpText?: string): Command {
    const command = new Command(this.client, name, null, null, helpText, this);
    this.children.push(command);
    return command;
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

  public command(key: string | RegExp, helpText: string = null): Command {
    const command = new Command(this, typeof key === 'string' ? key : null, null, key instanceof RegExp ? key : null, helpText);
    this.commands.push(command);
    return command;
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
      reply: (text, thread) => {
        return this.send(text, message.channel, thread ? message.ts : null);
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
    if ((message.subtype && message.subtype === 'bot_message') || (!message.subtype && message.user === this.rtm.activeUserId)) {
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

  public otherwise(messageSupplier: EventuallyString): this {
    this.onMessage(this.replier(messageSupplier));
    return this;
  }

  private replier(messageSupplier: EventuallyString, thread: boolean = false): OnSlackMessage {
    return (message, actions, ...args) => {
      this.stringify(messageSupplier, message, ...args).then(text => {
        if (text != null) {
          actions.reply(text, thread)
            .catch(reason => env.debug(() => `Could not deliver reply: ${reason}`));
        }
      });
    };
  }

  public replyTo(regex: RegExp, messageSupplier: EventuallyString, thread: boolean = false): this {
    this.onMessageMatch(regex, this.replier(messageSupplier, thread));
    return this;
  }

  public send(text: string, to: SlackId, threadTimestamp?: SlackTimestamp): Promise<void> {
    return new Promise((resolve, reject) => {
      // const escaped = text
      //   .replace(/&/g, '&amp;')
      //   .replace(/</g, '&lt;')
      //   .replace(/>/g, '&gt;')
      // ;
      this.web.chat.postMessage({
        text: text,
        channel: to,
        thread_ts: threadTimestamp == null ? null : threadTimestamp
      }).then(result => {
        if (result.ok) {
          resolve();
        } else {
          reject(result.error);
        }
      });
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

  private stringify(s: EventuallyString, message: DirectMessage, ...args): Promise<string | null> {
    let result = s;
    do {
      const previous = result;
      if (typeof result === 'string') {
        return Promise.resolve(result);
      }
      if (result instanceof Promise) {
        return result;
      }
      if (typeof result === 'function') {
        result = result(message, this.messageActions(message), ...args);
      }
      if (previous === result) {
        env.debug(() => `Never resolved: ${JSON.stringify(result)}`);
        return Promise.resolve(null);
      }
    } while (true);
  }
}

export const slackClient = new SlackClient(config.slack);
