import {DirectMessage} from './DirectMessage';
import {Channel} from './Channel';
import {PostableMessage} from './PostableMessage';
import {injectableType} from 'inclined-plane';

export type MaybePromise<T> = T | Promise<T>;
export type FromMessage<T> = (message: DirectMessage, actions: OnMessageActions, ...parts: string[]) => MaybePromise<T>;
export type OnSlackMessage = FromMessage<boolean | void>;
export type Eventually<T> = MaybePromise<T> | FromMessage<T>;
export type Postable = string | PostableMessage | PostableMessage[];
export type EventuallyPostable = Eventually<Postable>;

export interface CommandSummary {
  helpText: string;
  path: string;
}

export interface OnMessageActions {
  channel(name: string): Promise<Channel>;

  reply(...messages: PostableMessage[]): Promise<void>;
}

export interface SlackClient {

  messageActions(message: DirectMessage): OnMessageActions;

  onMessage(callback: OnSlackMessage): this;

  onMessageMatch(regex: RegExp, callback: OnSlackMessage): this;

  replier(messageSupplier: EventuallyPostable, thread?: boolean): OnSlackMessage;

  replyTo(regex: RegExp, messageSupplier: EventuallyPostable, thread?: boolean): this;

  send(...messages: PostableMessage[]): Promise<void>;

  start(): Promise<void>;
}

export const SlackClient = injectableType<SlackClient>('SlackClient');
