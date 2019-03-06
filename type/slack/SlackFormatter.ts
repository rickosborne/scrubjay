import {Tweet} from '../twitter/Tweet';

export class SlackFormatter {
  static slackFormat(tweet: Tweet): string {
    const lines: string[] = [];
    return lines.join('\n');
  }

  static build(): SlackFormatter {
    return new SlackFormatter();
  }
}
