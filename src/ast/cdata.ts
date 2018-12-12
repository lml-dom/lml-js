import { defaultConfig } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

import { Element } from './element';
import { Text } from './text';

/**
 * Representation of the HTML `<![CDATA[]]>` tag
 * This has no @angular/compiler AST class counterpart, but is done much like the {@link Comment Comment class}
 */
export class CData extends Element {
  /**
   * Directive character to identify CDATA
   */
  public static readonly LML_DIRECTIVE = '$';

  /**
   * @argument sourceSpan Full string source span (including the HTML tag or LML directive character)
   * @argument text Optionally add text child right away
   */
  constructor(sourceSpan: ParseSourceSpan, text?: Text) {
    super('cdata', [], (text ? [text] : []), sourceSpan);
  }

  public toHtml(config = defaultConfig, tabulation = ''): string {
    let content = '';
    for (const child of (this['children'] || [])) {
      if (child instanceof Text) {
        content += child.data;
      }
    }
    return `${tabulation}<![CDATA[${content}]]>\n`;
  }

  public toJSON(_config = defaultConfig): Object {
    return this.json({type: 'cdata'});
  }

  public toLml(config = defaultConfig, tabulation = ''): string {
    let content = '';
    for (const child of (this.children || [])) {
      if (child instanceof Text) {
        content += child.data;
      }
    }
    return `${tabulation}${CData.LML_DIRECTIVE}${this.multilineIndentation(content, config, tabulation)}\n`;
  }
}
