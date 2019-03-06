import {SlackId} from './RTEvent';

export interface Reaction {
  count: number;
  name: string;
  users: SlackId[];
}
