export type SlackId = string;
export type SlackTime = number;
export type SlackTimestamp = string;

export interface RTEvent {
  channel: SlackId;
  error?: {
    code: number,
    msg: string,
  };
  event_ts: SlackTimestamp;
  ts: SlackTimestamp;
  type: string;
  user: SlackId;
}
