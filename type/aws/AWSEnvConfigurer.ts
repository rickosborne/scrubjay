import {AWSConfigurer} from './AWSConfigurer';
import {Env} from '../../lib/env';
import * as AWS from 'aws-sdk';

@AWSConfigurer.implementation
export class AWSEnvConfigurer implements AWSConfigurer {

  constructor(
    @Env.required private readonly env: Env
  ) {
  }

  public buildConfig(): AWS.Config {
    return new AWS.Config({
      region: this.env.param('AWS_REGION', 'us-west-1'),
      credentials: {
        accessKeyId: this.env.param('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.env.param('AWS_SECRET_ACCESS_KEY'),
      }
    });
  }
}
