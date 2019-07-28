import * as fs from 'fs';
import {PathLike, WriteFileOptions} from 'fs';
import {injectableType} from 'inclined-plane';

export interface FileSystemAbstraction {
  appendFile(file: PathLike | number, data: any, options: WriteFileOptions, callback: (err: NodeJS.ErrnoException | null) => void): void;

  readFileSync(path: PathLike | number, options: { encoding: string; flag?: string; } | string): string;
}

export const FileSystemAbstraction = injectableType<FileSystemAbstraction>('FileSystemAbstraction');

// noinspection JSUnusedLocalSymbols
class FileSystemAbstractionProvider {
  @FileSystemAbstraction.supplier
  public static fileSystemAbstraction(): FileSystemAbstraction {
    return fs;
  }
}
