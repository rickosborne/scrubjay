import {SelectBlock} from './SelectBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {OptionBlock} from './OptionBlock';
import {OptionGroupBlock} from './OptionGroupBlock';
import {ConfirmationBlock} from './ConfirmationBlock';
import * as client from '@slack/web-api';

export class StaticSelectBlock extends SelectBlock {
  static readonly MAX_ACTIONID_LENGTH = 255;
  static readonly TYPE = 'static_select';

  constructor(
    placeholder: PlainTextBlock,
    actionId: string,
    public readonly options: OptionBlock[],
    public readonly optionGroups: OptionGroupBlock[],
    public readonly initialOption?: OptionBlock,
    confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(StaticSelectBlock.TYPE, placeholder, actionId, confirm, blockId);
  }

  get block(): client.StaticSelect {
    return {
      type: StaticSelectBlock.TYPE,
      action_id: this.actionId,
      confirm: this.confirm == null ? undefined : this.confirm.block,
      placeholder: this.placeholder == null ? undefined : this.placeholder.block,
      initial_option: this.initialOption == null ? undefined : this.initialOption.block,
      options: this.options == null || this.options.length === 0 ? undefined : this.options.map(o => o.block),
      option_groups: this.optionGroups == null || this.optionGroups.length === 0 ? undefined : this.optionGroups.map(og => og.block)
    };
  }
}
