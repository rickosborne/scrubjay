import {injectableType} from 'inclined-plane';

export interface TranscodeRequest {
  uri: string;
}

export interface TranscodeResponse {
  httpStatus: number;
  uri?: string;
}

export function isTranscodeResponse(obj: any): obj is TranscodeResponse {
  return obj != null && typeof obj.httpStatus === 'number';
}

export interface MediaTranscoder {
  attemptTranscode(videoUri: string): Promise<string | undefined>;
}

export const MediaTranscoder = injectableType<MediaTranscoder>('MediaTranscoder');
