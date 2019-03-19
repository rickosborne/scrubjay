import {expect} from 'chai';
import {describe, it} from 'mocha';
import {TestableScrubjayConfig} from '../../type/config/ScrubjayConfig.impl';

describe('Config', () => {
  it('picks up everything it should', () => {
    const json = {
      outputPath: 'output/path',
      baseUrl: 'base/url',
      twitter: {
        accessTokenKey: 'foo',
        accessTokenSecret: 'bar',
        consumerKey: 'consumer',
        consumerSecret: 'secret'
      },
      mysql: {
        schema: 'some schema',
        username: 'joshua',
        password: 'love',
        host: 'local',
        port: 1234
      },
      slack: {
        appId: 'app id',
        clientId: 'client id',
        token: 'some token',
        signingSecret: 'signing secret',
        verificationToken: 'verify me',
        oauth: 'my voice is my password',
        botOAuth: 'what are you doing dave'
      },
      version: 'some version'
    };
    const config = TestableScrubjayConfig.fromObject(json);
    expect(config).to.not.eq(null);
    expect(config.version).to.equal(json.version);
    expect(config.outputPath).to.equal(json.outputPath);
    expect(config.baseUrl).to.equal(json.baseUrl);
    expect(config.twitter.consumerSecret).to.equal(json.twitter.consumerSecret);
    expect(config.twitter.consumerKey).to.equal(json.twitter.consumerKey);
    expect(config.twitter.accessTokenSecret).to.equal(json.twitter.accessTokenSecret);
    expect(config.twitter.accessTokenKey).to.equal(json.twitter.accessTokenKey);
    expect(config.slack.token).to.equal(json.slack.token);
    expect(config.slack.botOAuth).to.equal(json.slack.botOAuth);
    expect(config.slack.clientId).to.equal(json.slack.clientId);
    expect(config.slack.appId).to.equal(json.slack.appId);
    expect(config.slack.oauth).to.equal(json.slack.oauth);
    expect(config.slack.signingSecret).to.equal(json.slack.signingSecret);
    expect(config.slack.verificationToken).to.equal(json.slack.verificationToken);
    expect(config.mysql.username).to.equal(json.mysql.username);
    expect(config.mysql.schema).to.equal(json.mysql.schema);
    expect(config.mysql.password).to.equal(json.mysql.password);
    expect(config.mysql.port).to.equal(json.mysql.port);
    expect(config.mysql.host).to.equal(json.mysql.host);
  });
});
