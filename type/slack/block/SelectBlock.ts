import {SlackBlock} from './SlackBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {ConfirmationBlock} from './ConfirmationBlock';

export abstract class SelectBlock extends SlackBlock {
  protected constructor(
    type: string,
    public readonly placeholder: PlainTextBlock | undefined,
    public readonly actionId: string,
    public readonly confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(type, blockId);
  }
}
