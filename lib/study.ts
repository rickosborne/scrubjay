declare type IfMatch = (...parts: string[]) => void;
declare type Runnable = () => void;

interface Studied {
  ifMatch(regex: RegExp, callback: IfMatch): Studied;
  otherwise(callback: () => void): void;
}

class Done implements Studied {
  ifMatch(regex: RegExp, callback: IfMatch): Studied {
    return this;
  }

  otherwise(callback: Runnable) {
  }
}

const done = new Done();

class Maybe implements Studied {
  constructor(private readonly string: string) {}

  ifMatch(regex: RegExp, callback: IfMatch): Studied {
    const matches = regex.exec(this.string);
    if (matches !== null) {
      callback(...matches.slice(1));
      return done;
    }
    return this;
  }

  otherwise(callback: () => void) {
    callback();
  }
}

export function study(string: string): Studied {
  return new Maybe(string);
}
