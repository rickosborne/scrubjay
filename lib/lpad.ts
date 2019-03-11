export function lpad(suffix: string | number, prefix: string, desiredLength: number) {
  const suff = '' + suffix;
  if (suff.length >= desiredLength) {
    return suff;
  }
  return prefix.repeat(desiredLength - suff.length) + suff;
}
