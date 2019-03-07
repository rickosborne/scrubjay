import {SlackBlock} from './SlackBlock';
import * as client from '@slack/client';
import {SlackId} from '../RTEvent';
import {buildAndCall} from '../SlackFormatBuilder';
import {UserBlock} from './UserBlock';
import {PlainTextBlock} from './PlaintextBlock';
import {MarkdownTextBlock} from './MarkdownTextBlock';
import {ImageElement} from './ImageElement';

export class ContextBlock extends SlackBlock {
  static readonly MAX_ELEMENTS = 10;
  static readonly TYPE = 'context';

  constructor(
    public readonly elements: (ImageElement | UserBlock | PlainTextBlock | MarkdownTextBlock)[],
    blockId?: string
  ) {
    super(ContextBlock.TYPE, blockId);
  }

  get block(): client.ContextBlock {
    return {
      type: ContextBlock.TYPE,
      elements: this.elements.map(el => el.block)
    };
  }

  public image(url: string, alt: string, callback: (image: ImageElement) => void): this {
    return buildAndCall(new ImageElement(url, alt), this.elements, callback);
  }

  public markdown(text: string, verbatim: boolean, callback: (markdown: MarkdownTextBlock) => void): this {
    return buildAndCall(new MarkdownTextBlock(text, verbatim), this.elements, callback);
  }

  public plainText(text: string, emoji: boolean = false, callback: (plainText: PlainTextBlock) => void): this {
    return buildAndCall(new PlainTextBlock(text, emoji), this.elements, callback);
  }

  public user(userId: SlackId, callback: (user: UserBlock) => void): this {
    return buildAndCall(new UserBlock(userId), this.elements, callback);
  }
}
