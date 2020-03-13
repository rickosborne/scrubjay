import {LogSwitch} from './Logger';

const XHR = require('xmlhttprequest').XMLHttpRequest;

const UNSENT = 0;
const OPENED = 1;
const HEADERS_RECEIVED = 2;
const LOADING = 3;
const DONE = 4;

export class Fetcher {
  constructor(
    private readonly logSwitch?: LogSwitch,
  ) {
  }

  public post<T>(url: string, body: any, expectedErrorStatuses: number[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      const bodyText: string = typeof body === 'string' ? body : JSON.stringify(body);
      const xhr = new XHR();
      const info = (msg: string) => this.logSwitch ? this.logSwitch.info(msg) : null;
      const error = (msg: string) => this.logSwitch ? this.logSwitch.error(msg) : null;
      xhr.onreadystatechange = function () {
        info(`State(${this.readyState}) ${url}`);
        if (this.readyState === DONE) {
          if (this.status >= 200 && this.status < 300) {
            const contentType = this.getResponseHeader('Content-Type');
            if (contentType != null && contentType.includes('json')) {
              const result = JSON.parse(this.responseText) as T;
              resolve(result);
            } else {
              const typeError = `ContentType=${contentType} ${url}`;
              error(typeError);
              reject(new Error(typeError));
            }
          } else {
            const statusError = `HttpStatus=${this.status} ${url}`;
            if (!expectedErrorStatuses.includes(this.status)) {
              error(statusError);
            }
            reject(new Error(statusError));
          }
        }
      };
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(bodyText);
    });
  }
}
