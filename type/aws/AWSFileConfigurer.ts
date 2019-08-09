import {AWSConfigurer} from './AWSConfigurer';
import * as AWS from 'aws-sdk';
import {AWSConfig} from '../config/AWSConfig';

@AWSConfigurer.implementation
export class AWSFileConfigurer implements AWSConfigurer {

  constructor(
    @AWSConfig.required private readonly awsConfig: AWSConfig,
  ) {
  }

  public buildConfig(): AWS.Config {
    return new AWS.Config({
      region: this.awsConfig.region,
      credentials: {
        accessKeyId: this.awsConfig.accessKeyId,
        secretAccessKey: this.awsConfig.secretAccessKey,
      }
    });
  }
}
