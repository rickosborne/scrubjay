import {injectableType} from 'inclined-plane';
import {Subscription} from 'rxjs';

export interface Notification {
  message: string;
  time: Date;
}

export interface NotifyQueue {

  readonly recent: Notification[];
  put(message: string, ...extra: any[]): void;

  subscribe(onNotification: (notification: Notification) => void): Subscription;
}

export const NotifyQueue = injectableType<NotifyQueue>('NotifyQueue');
