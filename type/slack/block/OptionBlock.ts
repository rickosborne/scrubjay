import {SlackBlock} from './SlackBlock';
import {PlainTextBlock} from './PlainTextBlock';
import * as client from '@slack/web-api';

export class OptionBlock extends SlackBlock {
  static readonly TYPE = 'option';

  constructor(
    public readonly text: PlainTextBlock,
    public readonly value: string,
    public readonly description?: PlainTextBlock,
    public readonly url?: string,
    blockId?: string,
  ) {
    super(OptionBlock.TYPE, blockId);
  }

  get block(): client.Option {
    return {
      text: this.text.block,
      description: this.description == null ? undefined : this.description.block,
      value: this.value,
      url: this.url
    };
  }
}
