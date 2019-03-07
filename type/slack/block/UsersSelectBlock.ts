import {SelectBlock} from './SelectBlock';
import {PlainTextBlock} from './PlainTextBlock';
import {SlackId} from '../RTEvent';
import {ConfirmationBlock} from './ConfirmationBlock';
import * as client from '@slack/client';

export class UsersSelectBlock extends SelectBlock {
  static readonly TYPE = 'users_select';

  constructor(
    placeholder: PlainTextBlock,
    actionId: string,
    public readonly initialUser?: SlackId,
    confirm?: ConfirmationBlock,
    blockId?: string,
  ) {
    super(UsersSelectBlock.TYPE, placeholder, actionId, confirm, blockId);
  }

  get block(): client.UsersSelect {
    return {
      type: UsersSelectBlock.TYPE,
      action_id: this.actionId,
      confirm: this.confirm == null ? undefined : this.confirm.block,
      initial_user: this.initialUser,
      placeholder: this.placeholder == null ? undefined : this.placeholder.block
    };
  }
}
