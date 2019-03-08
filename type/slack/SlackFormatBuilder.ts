import * as client from '@slack/client';
import {KnownBlockable} from './block/SlackBlock';
import {ContextBlock} from './block/ContextBlock';
import {TextBlock} from './block/TextBlock';
import {SectionBlock} from './block/SectionBlock';
import {ButtonElement} from './block/ButtonElement';
import {StaticSelectBlock} from './block/StaticSelectBlock';
import {ExternalSelectBlock} from './block/ExternalSelectBlock';
import {UsersSelectBlock} from './block/UsersSelectBlock';
import {ConversationsSelectBlock} from './block/ConversationsSelectBlock';
import {ChannelsSelectBlock} from './block/ChannelsSelectBlock';
import {DateSelectBlock} from './block/DateSelectBlock';
import {OverflowSelectBlock} from './block/OverflowSelectBlock';
import {AccessoryElement} from './block/AccessoryElement';

export function buildAndCall<T>(item: T, collection: T[], callback?: (item: T) => void) {
  collection.push(item);
  if (callback != null) {
    callback(item);
  }
  return this;
}

export declare type KnownActionBlock =
  UsersSelectBlock
  | StaticSelectBlock
  | ConversationsSelectBlock
  | ChannelsSelectBlock
  | ExternalSelectBlock
  | ButtonElement
  | OverflowSelectBlock
  | DateSelectBlock;

export interface ClientAction {
  action_id?: string;
  confirm?: client.Confirm;
  type: string;
}

// This is not defined by itself in @slack/client
export interface ClientOptionGroup {
  label: client.PlainTextElement;
  options: client.Option[];
}

export class SlackFormatBuilder {
  public readonly blocks: KnownBlockable[] = [];

  // noinspection JSUnusedGlobalSymbols
  public context(callback: (context: ContextBlock) => void): this {
    return buildAndCall(new ContextBlock([]), this.blocks, callback);
  }

  public section(text: TextBlock, fields: TextBlock[] = [], accessory: AccessoryElement): this {
    return buildAndCall(new SectionBlock(text, fields, accessory), this.blocks);
  }
}
