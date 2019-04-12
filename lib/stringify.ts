export function stringify(value: any): string {
  if (value === undefined) {
    return '(undefined)';
  } else if (value == null) {
    return '(null)';
  }
  switch (typeof value) {
    case 'string':
    case 'bigint':
    case 'symbol':
      return value.toString();
    case 'boolean':
      return `(${value})`;
    case 'number':
      return isNaN(value) ? '(NaN)' : value.toString();
    case 'function':
      return (value.name == null || value.name === '') ? '(() => {})' : `(${value.name}(){})`;
    case 'object':
      if (value instanceof Error) {
        return `!!! ${value.message}`;
      }
      if (Array.isArray(value)) {
        return JSON.stringify(value.map(val => stringify(val)), null, 2);
      }
  }
  return JSON.stringify(value, null, 2);
}
