import {TextBlock} from './TextBlock';
import * as client from '@slack/client';

export class MarkdownTextBlock extends TextBlock {
  static readonly TYPE = 'mrkdwn';

  constructor(
    text: string,
    public readonly verbatim: boolean = false,
    blockId?: string,
  ) {
    super(MarkdownTextBlock.TYPE, text, blockId);
  }

  get block(): client.MrkdwnElement {
    return {
      type: MarkdownTextBlock.TYPE,
      text: this.text,
      verbatim: this.verbatim,
    };
  }
}
