import {SelectBlock} from './SelectBlock';
import {OptionBlock} from './OptionBlock';
import {ConfirmationBlock} from './ConfirmationBlock';
import * as client from '@slack/client';

export class OverflowSelectBlock extends SelectBlock {
  static readonly OPTIONS_MAX = 5;
  static readonly OPTIONS_MIN = 2;
  static readonly TYPE = 'overflow';

  constructor(
    actionId: string,
    public readonly options: OptionBlock[],
    confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(OverflowSelectBlock.TYPE, null, actionId, confirm, blockId);
  }

  get block(): client.Overflow {
    return {
      type: OverflowSelectBlock.TYPE,
      action_id: this.actionId,
      confirm: this.confirm == null ? undefined : this.confirm.block,
      options: this.options == null || this.options.length < 1 ? undefined : this.options.map(o => o.block)
    };
  }
}
