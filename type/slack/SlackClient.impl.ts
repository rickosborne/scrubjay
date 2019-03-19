import {RTMClient, WebClient} from '@slack/client';
import {SlackConfig} from '../config/SlackConfig';
import {DirectMessage} from './DirectMessage';
import {PostableMessage} from './PostableMessage';
import {Channel} from './Channel';
import {WebChannelsListResult} from './WebChannelsListResult';
import env from '../../lib/env';
import {trim} from '../../lib/trim';
import {RTMConnectResult} from './RTMConnectResult';
import {SlackId, SlackTimestamp} from './RTEvent';
import {Eventually, EventuallyPostable, FromMessage, OnMessageActions, OnSlackMessage, Postable, SlackClient} from './SlackClient';

@SlackClient.provider
class SlackClientImpl implements SlackClient {

  private readonly oauth: string;
  private readonly onMessageCallbacks: OnSlackMessage[] = [];
  private rtm: RTMClient = null;
  private readonly web: WebClient;

  constructor(
    @SlackConfig.required cfg: SlackConfig
  ) {
    this.oauth = cfg.botOAuth;
    this.web = new WebClient(this.oauth);
  }

  // noinspection JSUnusedLocalSymbols
  public messageActions(message: DirectMessage): OnMessageActions {
    const self = this;
    return {
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

  public replier(messageSupplier: EventuallyPostable, thread: boolean = false): OnSlackMessage {
    return (message, actions, ...args) => {
      this.resolve(messageSupplier, message, ...args).then(text => {
        if (text != null) {
          actions.reply(...this.toPostables(text, message.channel, thread ? message.ts : undefined))
            .catch(env.debugFailure('Could not deliver reply'));
        }
      });
    };
  }

  public replyTo(regex: RegExp, messageSupplier: EventuallyPostable, thread: boolean = false): this {
    this.onMessageMatch(regex, this.replier(messageSupplier, thread));
    return this;
  }

  // noinspection JSMethodCanBeStatic
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
      return Promise.resolve(<T | null>result);
    } while (true);
  }

  public send(...messages: PostableMessage[]): Promise<void> {
    const maybeChain: Promise<void> = messages
      .map(message => new Promise<void>(resolve => {
        env.debug(() => message.toString());
        return this.web.chat.postMessage(message)
          .then(() => resolve())
          .catch(env.debugFailure(() => `Could not send message\n${message.toString()}\n`));
      }))
      .reduce((previousValue: Promise<void>, currentValue: Promise<void>) => {
        return previousValue == null ? currentValue : previousValue.then(() => currentValue);
      });
    return maybeChain == null ? Promise.resolve() : maybeChain;
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
        } else {
          resolve();
        }
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
