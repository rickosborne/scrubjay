import {isTranscodeResponse, MediaTranscoder, TranscodeRequest} from './MediaTranscoder';
import {MediaConfig} from '../config/MediaConfig';
import * as nodeFetch from 'node-fetch';
import {LogSwitch} from '../Logger';

export type Fetcher = (
  url: nodeFetch.RequestInfo,
  init?: nodeFetch.RequestInit
) => Promise<nodeFetch.Response>;

@MediaTranscoder.implementation
export class MediaTranscoderImpl implements MediaTranscoder {
  public static readonly TRANSCODER_CALL_FAILED = `Transcoder call failed`;

  constructor(
    @MediaConfig.required private readonly mediaConfig: MediaConfig,
    @LogSwitch.optional private readonly logSwitch?: LogSwitch,
    private readonly fetcher: Fetcher = nodeFetch as any,
  ) {
  }

  async attemptTranscode(videoUri: string): Promise<string> {
    if (this.logSwitch != null) {
      this.logSwitch.info(`Transcoding ${videoUri} via ${this.mediaConfig.transcoderUri}`);
    }
    return this.fetcher(this.mediaConfig.transcoderUri, <nodeFetch.RequestInit>{
      method: 'POST',
      body: JSON.stringify(<TranscodeRequest>{
        uri: videoUri
      })
    })
      .then(response => response.ok ? response.json() : undefined)
      .then(json => json != null && isTranscodeResponse(json) && json.uri != null ? json.uri : videoUri)
      .catch(reason => {
        if (this.logSwitch != null) {
          this.logSwitch.error(MediaTranscoderImpl.TRANSCODER_CALL_FAILED, reason);
        }
        return videoUri;
      });
  }
}
