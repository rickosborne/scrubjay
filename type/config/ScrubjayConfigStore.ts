import {injectableType} from 'inclined-plane';

export interface ScrubjayConfigStore {
  readonly followEmoji: Promise<string | undefined>;

  readonly notifyOnConnect: Promise<string | undefined>;
}

export const ScrubjayConfigStore = injectableType<ScrubjayConfigStore>('ScrubjayConfigStore');
