import {TextBlock} from './TextBlock';
import * as client from '@slack/web-api';

export class PlainTextBlock extends TextBlock {
  static readonly TYPE = 'plain_text';

  constructor(
    text: string,
    public readonly emoji: boolean = false,
    blockId?: string,
  ) {
    super(PlainTextBlock.TYPE, text, blockId);
  }

  get block(): client.PlainTextElement {
    return {
      type: PlainTextBlock.TYPE,
      text: this.text,
      emoji: this.emoji
    };
  }
}
