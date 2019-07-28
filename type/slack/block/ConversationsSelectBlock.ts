import {SelectBlock} from './SelectBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {SlackId} from '../RTEvent';
import {ConfirmationBlock} from './ConfirmationBlock';
import * as client from '@slack/web-api';

export class ConversationsSelectBlock extends SelectBlock {
  static readonly TYPE = 'conversations_select';

  constructor(
    placeholder: PlainTextBlock,
    actionId: string,
    public readonly initialConversation?: SlackId,
    confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(ConversationsSelectBlock.TYPE, placeholder, actionId, confirm, blockId);
  }

  get block(): client.ConversationsSelect {
    return {
      type: ConversationsSelectBlock.TYPE,
      action_id: this.actionId,
      initial_conversation: this.initialConversation,
      confirm: this.confirm == null ? undefined : this.confirm.block,
      placeholder: this.placeholder == null ? undefined : this.placeholder.block
    };
  }
}
