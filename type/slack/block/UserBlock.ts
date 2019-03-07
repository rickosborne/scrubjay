import {SlackBlock} from './SlackBlock';
import {SlackId} from '../RTEvent';
import * as client from '@slack/client';

export class UserBlock extends SlackBlock {
  static readonly TYPE = 'user';

  constructor(
    public readonly userId: SlackId,
  ) {
    super(UserBlock.TYPE);
  }

  get block(): client.UserElement {
    return {
      type: UserBlock.TYPE,
      user_id: this.userId
    };
  }
}
