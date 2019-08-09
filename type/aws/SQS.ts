import {injectableType, InterfaceType} from 'inclined-plane';

export interface SQSAdapter {
  queueForType<T>(type: InterfaceType<T>): Promise<TypedQueue<T>>;
}

export type TypedQueueHandler<T> = (item: T) => Promise<OnAvailableResult>;

export enum OnAvailableResult {
  HANDLED = 'handled',
  ERROR = 'error',
}

export interface TypedQueue<T> {
  add(item: T): Promise<void>;

  addListener(converter: (obj: any) => T | undefined, handler: (item: T) => Promise<OnAvailableResult>): void;
}

export const SQSAdapter = injectableType<SQSAdapter>('SQSAdapter');
