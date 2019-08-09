import {injectableType} from 'inclined-plane';

export interface AWSConfig {
  readonly accessKeyId: string;
  readonly region: string;
  readonly secretAccessKey: string;
}

export const AWSConfig = injectableType<AWSConfig>('AWSConfig');
