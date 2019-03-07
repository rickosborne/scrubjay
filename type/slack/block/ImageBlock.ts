import {SlackBlock} from './SlackBlock';
import * as client from '@slack/client';
import {PlainTextBlock} from './PlaintextBlock';

export class ImageBlock extends SlackBlock {
  static readonly TYPE = 'image';

  constructor(
    public readonly url: string,
    public readonly alt: string,
    public readonly title?: PlainTextBlock,
    blockId?: string
  ) {
    super(ImageBlock.TYPE, blockId);
  }

  get block(): client.ImageBlock {
    return {
      type: ImageBlock.TYPE,
      title: this.title == null ? undefined : this.title.block,
      alt_text: this.alt,
      block_id: this.blockId,
      image_url: this.url,
    };
  }
}
