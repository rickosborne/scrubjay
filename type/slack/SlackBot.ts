import {EventuallyPostable} from './SlackClient';
import {injectableType} from 'inclined-plane';
import {Tweet} from '../twitter/Tweet';
import {PostableMessage} from './PostableMessage';
import {SlackBotCommand} from './SlackBotCommand';

export interface RenderOptions {
  followEmoji?: string;
}

export interface SlackBot {
  command(key: string | RegExp, helpText: string | null, callback: (command: SlackBotCommand) => void): void;

  help(key: string | RegExp): void;

  messagesFromTweet(tweet: Tweet, options?: RenderOptions): PostableMessage[];

  otherwise(messageSupplier: EventuallyPostable): void;

  send(message: PostableMessage): Promise<void>;
}

export const SlackBot = injectableType<SlackBot>('SlackBot');
