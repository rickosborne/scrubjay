import {isTranscodeResponse, MediaTranscoder, TranscodeRequest, TranscodeResponse} from './MediaTranscoder';
import {MediaConfig} from '../config/MediaConfig';
import {LogSwitch} from '../Logger';
import {Fetcher} from '../Fetcher';

@MediaTranscoder.implementation
export class MediaTranscoderImpl implements MediaTranscoder {
  // public static readonly TRANSCODER_CALL_FAILED = `Transcoder call failed`;
  public fetcher?: Fetcher;

  constructor(
    @MediaConfig.required private readonly mediaConfig: MediaConfig,
    @LogSwitch.optional private readonly logSwitch?: LogSwitch,
  ) {
  }

  async attemptTranscode(videoUri: string): Promise<string | undefined> {
    this.info(undefined, `Transcoding ${videoUri} via ${this.mediaConfig.transcoderUri}`);
    if (this.fetcher == null) {
      this.fetcher = new Fetcher(this.logSwitch);
    }
    try {
      const response = await this.fetcher.post<TranscodeResponse>(this.mediaConfig.transcoderUri, <TranscodeRequest>{
        uri: videoUri
      }, [504]);
      if (!isTranscodeResponse(response)) {
        return this.error(`Not a transcode response ${videoUri}: ${JSON.stringify(response)}`);
      } else if (typeof response.uri !== 'string') {
        // return this.error(videoUri, `No URI for ${videoUri}: ${JSON.stringify(response)}`);
        return undefined;
      } else {
        return this.info(response.uri, `Transcoded ${videoUri} at ${response.uri}`);
      }
    } catch (reason) {
      return undefined;
      // return this.error(videoUri, MediaTranscoderImpl.TRANSCODER_CALL_FAILED, reason);
    }
  }

  private error<T>(message: string, errorArgs?: any): undefined {
    if (this.logSwitch != null) {
      this.logSwitch.error(message, errorArgs);
    }
    return undefined;
  }

  private info<T>(result: T, message: string): T {
    if (this.logSwitch != null) {
      this.logSwitch.info(message);
    }
    return result;
  }
}
