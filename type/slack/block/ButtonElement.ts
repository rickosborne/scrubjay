import {AccessoryElement} from './AccessoryElement';
import {PlainTextBlock} from './PlainTextBlock';
import * as client from '@slack/client';
import {ConfirmationBlock} from './ConfirmationBlock';

export class ButtonElement extends AccessoryElement {
  static readonly TYPE = 'button';

  constructor(
    public readonly text: PlainTextBlock,
    public readonly actionId: string,
    public readonly url?: string,
    public readonly value?: string,
    public readonly confirm?: ConfirmationBlock,
  ) {
    super(ButtonElement.TYPE);
  }

  get block(): client.Button {
    return {
      type: ButtonElement.TYPE,
      action_id: this.actionId,
      text: this.text.block,
      confirm: this.confirm == null ? undefined : this.confirm.block,
      url: this.url,
      value: this.value
    };
  }
}
