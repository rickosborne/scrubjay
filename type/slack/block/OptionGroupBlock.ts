import {SlackBlock} from './SlackBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {OptionBlock} from './OptionBlock';
import {ClientOptionGroup} from '../SlackFormatBuilder';

export class OptionGroupBlock extends SlackBlock {
  static readonly MAX_OPTIONS = 100;
  static readonly TYPE = 'option_group';

  constructor(
    public readonly label: PlainTextBlock,
    public readonly options: OptionBlock[],
    blockId?: string,
  ) {
    super(OptionGroupBlock.TYPE, blockId);
  }

  get block(): ClientOptionGroup {
    return {
      label: this.label.block,
      options: this.options.map(opt => opt.block)
    };
  }
}
