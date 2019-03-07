import {AccessoryElement} from './AccessoryElement';
import * as client from '@slack/client';

export class ImageElement extends AccessoryElement {
  static readonly TYPE = 'image';

  constructor(
    public readonly url: string,
    public readonly alt: string,
  ) {
    super(ImageElement.TYPE);
  }

  get block(): client.ImageElement {
    return {
      type: ImageElement.TYPE,
      image_url: this.url,
      alt_text: this.alt
    };
  }
}
