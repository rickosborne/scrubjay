import {injectableType} from 'inclined-plane';

export interface JSONFormatter {
  parse(json: string): any;

  stringify(obj: any): string;
}

export const JSONFormatter = injectableType<JSONFormatter>('JSONFormatter');
