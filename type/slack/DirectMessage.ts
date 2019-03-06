import {RTEvent, SlackId, SlackTimestamp} from './RTEvent';
import {Reaction} from './Reaction';

export interface DirectMessage extends RTEvent {
  client_msg_id: string;
  edited: {
    user: SlackId,
    ts: SlackTimestamp
  };
  hidden?: boolean;
  is_starred?: boolean;
  pinned_to?: SlackId[];
  reactions?: Reaction[];
  subtype?: string;
  team: SlackId;
  text: string;
  type: 'message';
}
