import {injectableType} from 'inclined-plane';
import * as AWS from 'aws-sdk';

export interface AWSConfigurer {
  buildConfig(): AWS.Config;
}

export const AWSConfigurer = injectableType<AWSConfigurer>('AWSConfigurer');
