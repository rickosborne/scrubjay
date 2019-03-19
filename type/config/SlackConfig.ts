import {injectableType} from 'inclined-plane';

export interface SlackConfig {
  readonly appId: string;
  readonly clientId: string;
  readonly token: string;
  readonly signingSecret: string;
  readonly verificationToken: string;
  readonly oauth: string;
  readonly botOAuth: string;
}

export const SlackConfig = injectableType<SlackConfig>('SlackConfig');
