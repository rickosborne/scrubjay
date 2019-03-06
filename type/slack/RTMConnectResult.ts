import {WebAPICallResult} from '@slack/client';

export interface RTMConnectResult extends WebAPICallResult {
  self?: {
    id: string,
    name: string
  };
  team?: {
    id: string,
    name: string,
    domain: string
  };
  url?: string;
}
