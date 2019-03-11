export function trim(s: string): string {
  return s == null ? '' : s.replace(/^\s+|\s+$/g, '');
}
