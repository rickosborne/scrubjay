import {injectableType} from 'inclined-plane';

export interface ScrubjayConfigStore {
  readonly followEmoji: Promise<string | null>;
}

export const ScrubjayConfigStore = injectableType<ScrubjayConfigStore>('ScrubjayConfigStore');
