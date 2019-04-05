import {SlackBlock} from './SlackBlock';
import * as client from '@slack/client';
import {ClientAction} from '../SlackFormatBuilder';

export abstract class AccessoryElement extends SlackBlock {
  protected constructor(
    type: string,
  ) {
    super(type);
  }

  abstract get block(): ClientAction
    | client.UsersSelect
    | client.StaticSelect
    | client.ConversationsSelect
    | client.ChannelsSelect
    | client.ExternalSelect
    | client.Button
    | client.Overflow
    | client.Datepicker
    | client.ImageElement
  ;
}
