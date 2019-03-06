import {WebAPICallResult} from '@slack/client';
import {Channel} from './Channel';

export interface WebChannelsListResult extends WebAPICallResult {
  channels: Channel[];
}
