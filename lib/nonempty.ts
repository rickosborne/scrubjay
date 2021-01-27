export function nonempty<T>(items: Array<T | undefined | null>): Array<NonNullable<T>> {
  return items.filter(item => item != null) as Array<NonNullable<T>>;
}
