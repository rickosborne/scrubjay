import {OnAvailableResult, SQSAdapter, TypedQueue, TypedQueueHandler} from './SQS';
import {InterfaceType} from 'inclined-plane';
import * as SQS from 'aws-sdk/clients/sqs';
import {AWSConfigurer} from './AWSConfigurer';
import {Env} from '../../lib/env';
import {JSONFormatter} from '../JSONFormatter';

export const MAX_QUEUE_RETENTION = 14 * 24 * 60 * 60;
export const QUEUE_INTERVAL_MS_MIN = 1000 * 60;
export const QUEUE_INTERVAL_MS_MAX = QUEUE_INTERVAL_MS_MIN * 5;
export const QUEUE_WAIT_S = 20;
export const QUEUE_INTERVAL_BACKOFF = 1.5;
export const QUEUE_MESSAGE_COUNT = 3;

class QueueWatcher<T> {
  private requestSequence = 0;
  private started = false;

  constructor(
    private readonly queueUrl: string,
    private readonly sqs: SQS,
    private readonly env: Env,
    private readonly handler: TypedQueueHandler<T>,
  ) {
  }

  public attempt(previousInterval: number = QUEUE_INTERVAL_MS_MAX): void {
    this.requestSequence++;
    this.env.debug(() => `QueueWatcher.attempt#${this.requestSequence}`);
    let interval = Math.min(QUEUE_INTERVAL_MS_MAX, Math.round(previousInterval * QUEUE_INTERVAL_BACKOFF));
    new Promise<SQS.Message[]>((resolve) => this.sqs.receiveMessage({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: QUEUE_MESSAGE_COUNT,
      WaitTimeSeconds: QUEUE_WAIT_S,
    }, async (recvErr, recvData) => {
      const messages: SQS.Message[] = recvData != null && recvData.Messages != null ? recvData.Messages : [];
      if (messages.length === QUEUE_MESSAGE_COUNT) {
        interval = QUEUE_INTERVAL_MS_MIN;
      } else if (messages.length > 0) {
        interval = Math.max(QUEUE_INTERVAL_MS_MIN, Math.round(previousInterval / QUEUE_INTERVAL_BACKOFF));
      }
      resolve(messages);
    }))
      .then(messages => Promise.all(messages.map(message => this.handleMessage(message))))
      .catch(this.env.debugFailure(() => `QueueWatcher.attempt#${this.requestSequence} failed`))
      .finally(() => setTimeout(() => this.attempt(interval), interval));
  }

  private deleteMessage(receiptHandle: string) {
    this.sqs.deleteMessage({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    }, (deleteError) => {
      if (deleteError != null) {
        this.env.debug(() => `QueueWatcher.handleMessage deleteMessage failed ${receiptHandle}`);
      }
    });
  }

  private async handleMessage(message: SQS.Message) {
    const json = message.Body;
    const receiptHandle = message.ReceiptHandle;
    if (json != null && receiptHandle != null) {
      try {
        const obj = JSON.parse(json) as T;
        if (obj != null) {
          const result = await this.handler(obj);
          if (result === OnAvailableResult.HANDLED) {
            setTimeout(() => this.deleteMessage(receiptHandle), 100);
          }
        }
      } catch (e) {
        this.env.debugFailure(() => `QueueWatcher ${this.queueUrl}`)(e);
      }
    }
  }

  public start(): void {
    if (!this.started) {
      this.attempt();
      this.started = true;
    }
  }
}

class TypedQueueImpl<T> implements TypedQueue<T> {
  private watcher?: QueueWatcher<T>;

  constructor(
    private readonly typeName: string,
    private readonly queueUrl: string,
    private readonly sqs: SQS,
    private readonly jsonFormatter: JSONFormatter,
    private readonly env: Env,
  ) {
  }

  public async add(item: T): Promise<void> {
    const json = this.jsonFormatter.stringify(item);
    return new Promise<string | undefined>((resolve, reject) => this.sqs.sendMessage({
      MessageBody: json,
      QueueUrl: this.queueUrl
    }, (sendErr, sendData) => {
      if (sendData != null) {
        resolve(sendData.MessageId);
      }
      this.env.debugFailure(() => `add<${this.typeName}>`)(sendErr);
      reject(sendErr);
    })).then((messageId) => {
      if (messageId != null) {
        this.env.debug(() => `add<${this.typeName}> => ${messageId}`);
      }
      return undefined;
    });
  }

  addListener(
    converter: (obj: any) => T | undefined,
    handler: (item: T) => Promise<OnAvailableResult>,
  ): void {
    if (this.watcher != null) {
      throw new Error('Queue listener is already defined');
    }
    this.watcher = new QueueWatcher<any>(this.queueUrl, this.sqs, this.env, async (obj) => {
      if (obj != null) {
        const item = converter(obj);
        if (item != null) {
          return handler(item);
        }
      }
      return OnAvailableResult.ERROR;
    });
    this.watcher.start();
  }
}

@SQSAdapter.implementation
class SQSAdapterImpl implements SQSAdapter {
  private readonly queuesByType: { [key: string]: Promise<TypedQueue<unknown>> } = {};
  private readonly sqs: SQS;

  public static resolveQueueUrl(
    typeName: string,
    sqs: SQS,
    env: Env,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      sqs.getQueueUrl({QueueName: typeName}, (getErr, getData) => {
        if (getData != null && getData.QueueUrl != null) {
          resolve(getData.QueueUrl);
          return;
        }
        env.debugFailure('resolveQueueUrl:getQueueUrl')(getErr);
        sqs.createQueue({
          QueueName: typeName,
          Attributes: {
            MessageRetentionPeriod: String(MAX_QUEUE_RETENTION), // 14d
          }
        }, (createError, createData) => {
          if (createData != null && createData.QueueUrl != null) {
            resolve(createData.QueueUrl);
            return;
          }
          env.debugFailure('resolveQueueUrl:createQueue')(createError);
          reject(new Error(`resolveQueueUrl could not find or create: ${typeName}`));
        });
      });
    });
  }

  constructor(
    @AWSConfigurer.required awsConfigurer: AWSConfigurer,
    @Env.required private readonly env: Env,
    @JSONFormatter.required private readonly jsonFormatter: JSONFormatter,
  ) {
    const awsConfig = awsConfigurer.buildConfig();
    this.sqs = new SQS(awsConfig);
  }

  queueForType<T>(type: InterfaceType<T>): Promise<TypedQueue<T>> {
    let queue = this.queuesByType[type.name] as Promise<TypedQueue<T>>;
    if (queue == null) {
      queue = SQSAdapterImpl.resolveQueueUrl(type.name, this.sqs, this.env).then(queueUrl => {
        return new TypedQueueImpl<T>(type.name, queueUrl, this.sqs, this.jsonFormatter, this.env);
      });
      this.queuesByType[type.name] = queue;
    }
    return queue;
  }

}
