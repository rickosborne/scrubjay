import {expect} from 'chai';
import {describe, it} from 'mocha';
import {MediaTranscoder, TranscodeRequest, TranscodeResponse} from "../../type/aphelocoma/MediaTranscoder";
import {MediaTranscoderImpl} from "../../type/aphelocoma/MediaTranscoder.impl";
import {MediaConfig} from "../../type/config/MediaConfig";
import {LogSwitch} from "../../type/Logger";
import * as fs from 'fs';
import * as path from 'path';
import {Fetcher} from "../../type/Fetcher";

describe('MediaTranscoder', async () => {
  const FETCH_FAIL_MESSAGE = `Fetcher !`;

  class TestableFetcher extends Fetcher {
    public lastBody?: any;
    public lastUrl?: RequestInfo;
    public nextResponse?: TranscodeResponse;


    post<T>(url: string, body: any): Promise<T> {
      this.lastUrl = url;
      this.lastBody = body;
      if (this.nextResponse == null) {
        throw new Error(FETCH_FAIL_MESSAGE);
      } else {
        return Promise.resolve(this.nextResponse as unknown as T);
      }
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
    transcoder: MediaTranscoderImpl;
    videoUri: string;
  }

  function buildContext(): Context {
    const fetcher = new TestableFetcher();
    const config = new TestableMediaConfig();
    const logSwitch = new TestableLogSwitch();
    const transcoder = new MediaTranscoderImpl(config, logSwitch);
    const videoUri = 'video' + Math.random();
    transcoder.fetcher = fetcher;
    return {config, fetcher, logSwitch, transcoder, videoUri};
  }

  async function doTest(
    nextResponse?: TranscodeResponse,
    fetchedUri?: string,
  ): Promise<Context> {
    const test = buildContext();
    test.fetcher.nextResponse = nextResponse;
    const gifUri = await test.transcoder.attemptTranscode(test.videoUri);
    expect(gifUri).equals(fetchedUri || test.videoUri);
    expect(test.fetcher.lastUrl).equals(test.config.transcoderUri);
    expect(test.fetcher.lastBody).deep.equals(<TranscodeRequest>{
      uri: test.videoUri,
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

  it('returns the updated if provided', async () => {
    const fetchedUri = 'fetched' + Math.random();
    const test = await doTest({httpStatus: 202, uri: fetchedUri}, fetchedUri);
    expect(test.logSwitch.errors).is.empty;
  });

  it('resolves fetch', async () => {
    const test = buildContext();
    test.transcoder.fetcher = undefined;
    test.config.transcoderUri = JSON.parse(fs.readFileSync(path.join(__dirname, '../../scrubjay.conf.json'), {encoding: 'utf-8'})).media.transcoderUri;
    const videoUri = 'https://video.twimg.com/tweet_video/ERFCCP0UEAA0cAr.mp4';
    const transcoded = await test.transcoder.attemptTranscode(videoUri);
    expect(transcoded).not.equals(videoUri);
  });
});
