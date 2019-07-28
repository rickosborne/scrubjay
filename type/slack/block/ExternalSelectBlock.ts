import {SelectBlock} from './SelectBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {OptionBlock} from './OptionBlock';
import {ConfirmationBlock} from './ConfirmationBlock';
import * as client from '@slack/web-api';

export class ExternalSelectBlock extends SelectBlock {
  static readonly TYPE = 'external_select';

  constructor(
    placeholder: PlainTextBlock,
    actionId: string,
    public readonly initialOption: OptionBlock,
    public readonly minQueryLength?: number,
    confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(ExternalSelectBlock.TYPE, placeholder, actionId, confirm, blockId);
  }

  get block(): client.ExternalSelect {
    return {
      type: ExternalSelectBlock.TYPE,
      confirm: this.confirm == null ? undefined : this.confirm.block,
      action_id: this.actionId,
      initial_option: this.initialOption == null ? undefined : this.initialOption.block,
      min_query_length: this.minQueryLength,
      placeholder: this.placeholder == null ? undefined : this.placeholder.block
    };
  }
}
