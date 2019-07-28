import {WebAPICallResult} from '@slack/web-api';
import {Channel} from './Channel';

export interface WebChannelsListResult extends WebAPICallResult {
  channels: Channel[];
}
