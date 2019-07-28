import * as client from '@slack/web-api';
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

export function buildAndCall<T>(item: T, collection: any[], callback?: (item: T) => void): void {
  collection.push(item);
  if (callback != null) {
    callback(item);
  }
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
    buildAndCall(new ContextBlock([]), this.blocks, callback);
    return this;
  }

  public section(text: TextBlock, fields: TextBlock[] = [], accessory: AccessoryElement | undefined): this {
    buildAndCall(new SectionBlock(text, fields, accessory), this.blocks);
    return this;
  }
}
