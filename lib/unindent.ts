import {trim} from './trim';

export function unindent(s: string): string {
  const matches = /^\s*\r?\n([ \x09]+)/.exec(s);
  if (matches == null || matches[1] == null) {
    return s;
  }
  const start = matches[1];
  return trim(s.replace(new RegExp('(\\r?\\n)' + start, 'g'), '$1'));
}

export function indentHanging(s: string, spaces: number): string {
  return s.replace(/\n/g, '\n' + ' '.repeat(spaces));
}
