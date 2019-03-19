export function plural(n: number, pluralSuffix: string = 's', singularSuffix: string = ''): string {
  return n === 1 ? singularSuffix : pluralSuffix;
}
