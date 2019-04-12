import {NotifyQueue, Notification} from './NotifyQueue';
import {ReplaySubject, Subscription} from 'rxjs';
import {stringify} from '../lib/stringify';

@NotifyQueue.implementation
class NotifyQueueImpl implements NotifyQueue {
  public static readonly QUEUE_LENGTH: number = 5;
  private readonly subject: ReplaySubject<Notification> = new ReplaySubject(NotifyQueueImpl.QUEUE_LENGTH);

  private _recent: Notification[] = [];

  public get recent(): Notification[] {
    return this._recent.slice();
  }

  put(message: string, ...extra: any[]): void {
    const msg = [message]
      .concat(extra)
      .map(val => stringify(val))
      .join(' ');
    const notification: Notification = {
      message: msg,
      time: new Date(),
    };
    this._recent.push(notification);
    while (this._recent.length > NotifyQueueImpl.QUEUE_LENGTH) {
      this._recent.shift();
    }
    this.subject.next(notification);
  }

  subscribe(onNotification: (notification: Notification) => void): Subscription {
    return this.subject.subscribe(onNotification);
  }
}
