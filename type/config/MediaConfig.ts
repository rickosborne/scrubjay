import {injectableType} from 'inclined-plane';

export interface MediaConfig {
  readonly transcoderUri: string;
}

export const MediaConfig = injectableType<MediaConfig>('MediaConfig');
