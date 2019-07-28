import {SelectBlock} from './SelectBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {SlackId} from '../RTEvent';
import {ConfirmationBlock} from './ConfirmationBlock';
import * as client from '@slack/web-api';

export class ChannelsSelectBlock extends SelectBlock {
  static readonly TYPE = 'channels_select';

  constructor(
    placeholder: PlainTextBlock,
    actionId: string,
    public readonly initialChannel?: SlackId,
    confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(ChannelsSelectBlock.TYPE, placeholder, actionId, confirm, blockId);
  }

  get block(): client.ChannelsSelect {
    return {
      type: ChannelsSelectBlock.TYPE,
      action_id: this.actionId,
      initial_channel: this.initialChannel,
      placeholder: this.placeholder == null ? undefined : this.placeholder.block,
      confirm: this.confirm == null ? undefined : this.confirm.block
    };
  }
}
