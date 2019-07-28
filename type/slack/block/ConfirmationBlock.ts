import {SlackBlock} from './SlackBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {TextBlock} from './TextBlock';
import * as client from '@slack/web-api';

export class ConfirmationBlock extends SlackBlock {
  static readonly TYPE = 'confirm';

  constructor(
    public readonly title: PlainTextBlock,
    public readonly text: TextBlock,
    public readonly confirm: PlainTextBlock,
    public readonly deny: PlainTextBlock,
  ) {
    super(ConfirmationBlock.TYPE);
  }

  get block(): client.Confirm {
    return {
      confirm: this.confirm.block,
      deny: this.deny.block,
      text: this.text.block,
      title: this.title.block
    };
  }
}
