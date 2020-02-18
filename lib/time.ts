import {lpad} from './lpad';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface TimeJump {
  suffix?: string;
  toSlower?: number;
}

const timeJumps: TimeJump[] = [{
  toSlower: 1000
}, {
  toSlower: 60,
  suffix: 's'
}, {
  toSlower: 60,
  suffix: 'm'
}, {
  toSlower: 24,
  suffix: 'h'
}, {
  toSlower: 7,
  suffix: 'd'
}, {
  suffix: 'w'
}];

export function fixed(num: number, length: number = 2, prefix: string = '0'): string {
  return lpad(num, prefix, length);
}

export function getTimeHHMM(date: Date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return fixed(d.getHours()) + ':' + fixed(d.getMinutes());
}

export function getTimeHHMMSS(date: Date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return getTimeHHMM(d) + ':' + fixed(d.getSeconds());
}

export function getDateDDMMMYYYY(date: Date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = MONTHS[d.getMonth()];
  return `${fixed(d.getDate())} ${month} ${d.getFullYear()}`;
}

export function getDateYYYYMMDD(date: Date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${fixed(date.getFullYear())}-${fixed(d.getMonth() + 1)}-${fixed(d.getDate())}`;
}

export function getLongDateTime(date: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const weekday = WEEKDAYS[d.getDay()];
  const dt = getDateDDMMMYYYY(date);
  const time = getTimeHHMM(date);
  return `${weekday}, ${dt} at ${time}`;
}

export function formatDurationMS(ms: number): string {
  const parts: string[] = [];
  let remaining = ms;
  for (const timeJump of timeJumps) {
    if (remaining <= 0) {
      break;
    }
    let leftover: number | null = null;
    if (timeJump.toSlower == null) {
      leftover = remaining;
      remaining = 0;
    } else {
      leftover = remaining % timeJump.toSlower;
      remaining = Math.floor(remaining / timeJump.toSlower);
    }
    if (leftover !== 0 && timeJump.suffix != null) {
      parts.unshift(`${leftover}${timeJump.suffix}`);
    }
  }
  return parts.join(' ');
}
