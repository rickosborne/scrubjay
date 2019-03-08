export type Supplier<T> = () => T;
export type Obtainable<T> = T | Supplier<T>;
export type Resolvable<T> = Obtainable<T> | Promise<T>;

export function obtain<T>(obtainable: Obtainable<T>): T {
  return (typeof obtainable === 'function') ? (<Supplier<T>>obtainable)() : obtainable;
}

export function resolve<T>(resolvable: Resolvable<T>): Promise<T> {
  return resolvable instanceof Promise ? resolvable : Promise.resolve(obtain(resolvable));
}
