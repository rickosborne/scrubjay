import {EventuallyPostable, SlackClient} from './SlackClient';

export interface SlackBotCommand {
  readonly client: SlackClient;
  readonly helpText?: string;
  readonly literal: string;
  readonly matcher: RegExp;
  readonly paramName: string;
  readonly parent: SlackBotCommand | null;
  readonly path: string;
  readonly pattern: RegExp;
  readonly children: SlackBotCommand[];

  param(name: string, helpText: string | null, callback: (subcommand: SlackBotCommand) => void): this;

  reply(eventually: EventuallyPostable, thread?: boolean): this;

  rest(helpText: string | null, callback: (subcommand: SlackBotCommand) => void): this;

  subcommand(name: string, helpText: string | null, callback: (subcommand: SlackBotCommand) => void): this;
}
