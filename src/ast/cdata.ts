import { defaultOutputConfig } from '../config';
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
   * Fake tag name. Used for parent identification, for example in CHARACTER_SAFE_ELEMENTS in text.ts
   */
  public readonly name = 'cdata';

  /**
   * @argument sourceSpan Full string source span (including the HTML tag or LML directive character)
   * @argument text Optionally add text child right away
   */
  constructor(sourceSpan?: ParseSourceSpan, text?: Text) {
    super('cdata', [], (text ? [text] : []), sourceSpan);
  }

  public toAST(config = defaultOutputConfig()): Object {
    return this.astInfo({type: 'cdata', children: (this.children || []).map((child) => child.toAST(config))});
  }

  public toHTML(_config = defaultOutputConfig(), tabulation = ''): string {
    let content = '';
    for (const child of (this['children'] || [])) {
      if (child instanceof Text) {
        content += child.data;
      }
    }
    return `${tabulation}<![CDATA[${content}]]>\n`;
  }

  public toJSON(config = defaultOutputConfig()): Object {
    return {type: 'cdata', children: (this.children || []).map((child) => child.toJSON(config))};
  }

  public toLML(config = defaultOutputConfig(), tabulation = ''): string {
    let content = '';
    for (const child of (this.children || [])) {
      if (child instanceof Text) {
        content += child.data;
      }
    }
    return `${tabulation}${CData.LML_DIRECTIVE}${this.multilineIndentation(content, config, tabulation)}\n`;
  }
}
