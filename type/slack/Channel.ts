import {SlackId, SlackTime} from './RTEvent';

export interface Channel {
  created: SlackTime;
  creator: SlackId;
  id: SlackId;
  is_archived: boolean;
  is_channel: boolean;
  is_general: boolean;
  is_member: boolean;
  is_mpim: false;
  is_org_shared: boolean;
  is_private: boolean;
  is_shared: boolean;
  members: string[];
  name: string;
  name_normalized: string;
  num_members: number;
  previous_names: [];
  purpose: {
    value: string,
    creator: SlackId,
    last_set: SlackTime
  };
  topic: {
    value: string,
    creator: SlackId,
    last_set: SlackTime
  };
  unlinked: number;
}
