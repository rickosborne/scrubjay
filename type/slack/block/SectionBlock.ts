import {KnownBlockable, SlackBlock} from './SlackBlock';
import {TextBlock} from './TextBlock';
import * as client from '@slack/client';
import {AccessoryElement} from './AccessoryElement';

export class SectionBlock extends SlackBlock implements KnownBlockable {
  static readonly TYPE = 'section';

  constructor(
    public readonly text: TextBlock,
    public readonly fields?: TextBlock[],
    public readonly accessory?: AccessoryElement,
    blockId?: string,
  ) {
    super(SectionBlock.TYPE, blockId);
  }

  get block(): client.SectionBlock {
    return {
      type: SectionBlock.TYPE,
      block_id: this.blockId,
      accessory: this.accessory == null ? undefined : this.accessory.block,
      fields: this.fields == null ? undefined : this.fields.map(f => f.block),
      text: this.text.block
    };
  }
}
