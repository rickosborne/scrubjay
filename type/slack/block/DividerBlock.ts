import {SlackBlock} from './SlackBlock';
import * as client from '@slack/web-api';

export class DividerBlock extends SlackBlock {
  static readonly TYPE = 'divider';

  constructor(blockId?: string) {
    super(DividerBlock.TYPE, blockId);
  }

  get block(): client.DividerBlock {
    return {
      type: DividerBlock.TYPE
    };
  }
}
