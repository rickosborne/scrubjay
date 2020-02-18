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
    this.info(undefined, `Transcoding ${videoUri} via ${this.mediaConfig.transcoderUri}`);
    try {
      const response = await this.fetcher(this.mediaConfig.transcoderUri, <nodeFetch.RequestInit>{
        method: 'POST',
        body: JSON.stringify(<TranscodeRequest>{
          uri: videoUri
        })
      });
      if (!response.ok) {
        return this.error(videoUri, `Could not transcode ${videoUri}: ${response.status}`);
      }
      const json = await response.json();
      if (json == null) {
        return this.error(videoUri, `Empty JSON body for ${videoUri}`);
      } else if (!isTranscodeResponse(json)) {
        return this.error(videoUri, `Not a transcode response ${videoUri}: ${JSON.stringify(json)}`);
      } else if (typeof json.uri !== 'string') {
        return this.error(videoUri, `No URI for ${videoUri}: ${JSON.stringify(json)}`);
      } else {
        return this.info(json.uri, `Transcoded ${videoUri} at ${json.uri}`);
      }
    } catch (reason) {
      return this.error(videoUri, MediaTranscoderImpl.TRANSCODER_CALL_FAILED, reason);
    }
  }

  private error<T>(result: T, message: string, errorArgs?: any): T {
    if (this.logSwitch != null) {
      this.logSwitch.error(message, errorArgs);
    }
    return result;
  }

  private info<T>(result: T, message: string): T {
    if (this.logSwitch != null) {
      this.logSwitch.info(message);
    }
    return result;
  }
}
