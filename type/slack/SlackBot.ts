import {EventuallyPostable} from './SlackClient';
import {injectableType} from 'inclined-plane';
import {Tweet} from '../twitter/Tweet';
import {PostableMessage} from './PostableMessage';
import {SlackBotCommand} from './SlackBotCommand';

export interface RenderOptions {
  followEmoji?: string | null;
}

export interface SlackBot {
  command(key: string | RegExp, helpText: string | undefined, callback: (command: SlackBotCommand) => void): void;

  help(key: string | RegExp): void;

  messagesFromTweet(tweet: Tweet, options?: RenderOptions): Promise<PostableMessage[]>;

  otherwise(messageSupplier: EventuallyPostable): void;

  send(message: PostableMessage): Promise<void>;
}

export const SlackBot = injectableType<SlackBot>('SlackBot');
