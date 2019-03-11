export function boolish(value: any, defaultValue?: boolean): boolean {
  switch (typeof value) {
    case 'object':
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return Object.keys(value).length > 0;
    case 'string':
      return ['', 'f', 'false', 'no', 'n', '0'].indexOf(value.toLowerCase()) < 0;
    case 'bigint':
    case 'number':
      return value !== 0;
    case 'boolean':
      return value;
    case 'undefined':
      return defaultValue;
    case 'symbol':
    case 'function':
      throw new Error(`Don't know how to booleanize: ${value.toString()}`);
  }
}
