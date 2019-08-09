import {JSONFormatter} from './JSONFormatter';

@JSONFormatter.implementation
class JSONFormatterImpl implements JSONFormatter {
  protected deepCopy(obj: any): any {
    if (obj == null) {
      return null;
    } else if (Array.isArray(obj)) {
      return obj.map(o => this.deepCopy(o));
    }
    switch (typeof obj) {
      case 'bigint':
      case 'number':
      case 'string':
      case 'boolean':
        return obj;
      case 'object':
        return Object.keys(obj)
          // .filter(key => typeof key === 'string')
          .sort()
          .reduce((result, key) => {
            const originalValue = obj[key];
            const convertedValue = this.deepCopy(originalValue);
            if (convertedValue !== undefined) {
              result[key] = convertedValue;
            }
            return result;
          }, {} as { [key: string]: any });
      default:
        return undefined;
    }
  }

  parse(json: string): any {
    return JSON.parse(json);
  }

  stringify(obj: any): string {
    return JSON.stringify(this.deepCopy(obj));
  }
}
