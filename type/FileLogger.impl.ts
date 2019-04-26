import {LogSwitch} from './Logger';
import {FileSystemAbstraction} from './FileSystemAbstraction';
import {Environment} from './Environment';
import {getDateYYYYMMDD, getTimeHHMMSS} from '../lib/time';

const logSwitch = LogSwitch.getInstance();
const fs = FileSystemAbstraction.getInstance();
const environment = Environment.getInstance();

const errorFile = environment['ERROR_FILE'];
if (typeof errorFile === 'string') {
  logSwitch.onError((message) => {
    const date = new Date();
    const d = getDateYYYYMMDD(date);
    const t = getTimeHHMMSS(date);
    const msg = `${d} ${t} ${message}\n`;
    fs.appendFile(errorFile, msg, {encoding: 'utf-8'}, (err) => {
      console.error(`Could not append to file ${errorFile}: ${JSON.stringify(err)}`);
    });
  });
}
