import {SelectBlock} from './SelectBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {ConfirmationBlock} from './ConfirmationBlock';
import * as client from '@slack/web-api';

export class DateSelectBlock extends SelectBlock {
  static readonly DATE_FORMAT = 'YYYY-MM-DD';
  static readonly TYPE = 'datepicker';

  constructor(
    placeholder: PlainTextBlock,
    actionId: string,
    public readonly initialDate?: string,
    confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(DateSelectBlock.TYPE, placeholder, actionId, confirm, blockId);
  }

  get block(): client.Datepicker {
    return {
      type: DateSelectBlock.TYPE,
      action_id: this.actionId,
      initial_date: this.initialDate,
      confirm: this.confirm == null ? undefined : this.confirm.block
    };
  }
}
