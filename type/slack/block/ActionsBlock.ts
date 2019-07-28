import {SlackBlock} from './SlackBlock';
import * as client from '@slack/web-api';
import {KnownActionBlock} from '../SlackFormatBuilder';

export class ActionsBlock extends SlackBlock {
  static readonly TYPE = 'actions';

  constructor(
    public readonly elements: KnownActionBlock[],
    blockId?: string
  ) {
    super(ActionsBlock.TYPE, blockId);
  }

  get block(): client.ActionsBlock {
    return {
      type: ActionsBlock.TYPE,
      elements: this.elements.map(el => el.block),
      block_id: this.blockId,
    };
  }
}
