import {SlackBlock} from './SlackBlock';
import * as client from '@slack/client';

export abstract class TextBlock extends SlackBlock {
  protected constructor(
    type: 'mrkdwn' | 'plain_text',
    public readonly text: string,
    blockId?: string,
  ) {
    super(type, blockId);
  }

  abstract get block(): client.PlainTextElement | client.MrkdwnElement;
}
