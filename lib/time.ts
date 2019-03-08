import {lpad} from './lpad';

export function fixed(num: number, length: number = 2, prefix: string = '0'): string {
  return lpad(num, prefix, length);
}

export function getTimeHHMM(date: Date = new Date()) {
  return fixed(date.getHours()) + ':' + fixed(date.getMinutes());
}

export function getTimeHHMMSS(date: Date = new Date()) {
  return getTimeHHMM(date) + ':' + fixed(date.getSeconds());
}
