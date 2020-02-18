import {expect} from 'chai';
import {describe, it} from 'mocha';
import {MediaTranscoder, TranscodeRequest, TranscodeResponse} from "../../type/aphelocoma/MediaTranscoder";
import {Fetcher, MediaTranscoderImpl} from "../../type/aphelocoma/MediaTranscoder.impl";
import {MediaConfig} from "../../type/config/MediaConfig";
import {RequestInfo, RequestInit, Response} from "node-fetch";
import {LogSwitch} from "../../type/Logger";

describe('MediaTranscoder', async () => {
  const FETCH_FAIL_MESSAGE = `Fetcher !`;

  class TestableFetcher {
    public lastInit?: RequestInit;
    public lastUrl?: RequestInfo;
    public nextResponse?: Partial<Response>;

    get fetcher(): Fetcher {
      return async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
        this.lastUrl = url;
        this.lastInit = init;
        if (this.nextResponse == null) {
          throw new Error(FETCH_FAIL_MESSAGE);
        } else {
          return this.nextResponse as Response;
        }
      };
    }
  }

  class TestableLogSwitch implements LogSwitch {
    public readonly errors: any[] = [];
    public readonly infos: any[] = [];

    error(message?: any, ...optionalParams: any[]): void {
      this.errors.push(message);
    }

    info(message?: any, ...optionalParams: any[]): void {
      this.infos.push(message);
    }

    onError(logger: (message?: any, ...optionalParams: any[]) => void): void {
    }

    onInfo(logger: (message?: any, ...optionalParams: any[]) => void): void {
    }
  }

  class TestableMediaConfig implements MediaConfig {
    public transcoderUri: string = Math.random() + '';
  }

  interface Context {
    config: TestableMediaConfig;
    fetcher: TestableFetcher;
    logSwitch: TestableLogSwitch;
    transcoder: MediaTranscoder;
    videoUri: string;
  }

  function buildContext(): Context {
    const fetcher = new TestableFetcher();
    const config = new TestableMediaConfig();
    const logSwitch = new TestableLogSwitch();
    const transcoder = new MediaTranscoderImpl(config, logSwitch, fetcher.fetcher);
    const videoUri = 'video' + Math.random();
    return {config, fetcher, logSwitch, transcoder, videoUri};
  }

  async function doTest(
    nextResponse?: Partial<Response>,
    fetchedUri?: string,
  ): Promise<Context> {
    const test = buildContext();
    test.fetcher.nextResponse = nextResponse;
    const gifUri = await test.transcoder.attemptTranscode(test.videoUri);
    expect(gifUri).equals(fetchedUri || test.videoUri);
    expect(test.fetcher.lastUrl).equals(test.config.transcoderUri);
    expect(test.fetcher.lastInit).deep.equals(<RequestInit>{
      method: 'POST',
      body: JSON.stringify(<TranscodeRequest>{
        uri: test.videoUri,
      }),
    });
    const expectedInfos = [
      `Transcoding ${test.videoUri} via ${test.config.transcoderUri}`,
    ];
    if (fetchedUri != null) {
      expectedInfos.push(`Transcoded ${test.videoUri} at ${fetchedUri}`);
    }
    expect(test.logSwitch.infos).deep.equals(expectedInfos);
    return test;
  }

  it('catches errors', async () => {
    const test = await doTest();
    expect(test.logSwitch.errors).deep.equals([MediaTranscoderImpl.TRANSCODER_CALL_FAILED]);
  });

  it('returns the original on non-success', async () => {
    const test = await doTest({
      ok: true,
      json: async () => {
        throw new Error('Did not expect json() call');
      }
    });
    expect(test.logSwitch.errors).deep.equals([MediaTranscoderImpl.TRANSCODER_CALL_FAILED]);
  });

  it('returns the original on no-uri', async () => {
    const test = await doTest({
      ok: true,
      json: async () => (<TranscodeResponse>{httpStatus: 500})
    });
    expect(test.logSwitch.errors).deep.equals([
      `No URI for ${test.videoUri}: {"httpStatus":500}`
    ]);
  });

  it('returns the updated if provided', async () => {
    const fetchedUri = 'fetched' + Math.random();
    const test = await doTest({
      ok: true,
      json: async () => (<TranscodeResponse>{httpStatus: 202, uri: fetchedUri})
    }, fetchedUri);
    expect(test.logSwitch.errors).is.empty;
  });
});
