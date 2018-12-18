import { defaultConfig } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

import { Node } from './node';

/**
 * Representation of the `<!DOCTYPE html>` and similar tags
 * This has no @angular/compiler AST class counterpart, but is done much like the {@link Comment Comment class}
 */
export class Directive extends Node {
  /**
   * Directive character to identify an HTML directive.
   */
  public static readonly LML_DIRECTIVE = '!';

  /**
   * @argument data Text content
   * @argument sourceSpan Full string source span (including the HTML tag or LML directive character)
   */
  constructor(public data: string, sourceSpan: ParseSourceSpan) {
    super(sourceSpan);
  }

  public toHTML(config = defaultConfig): string {
    return `<${this.data}>\n`;
  }

  public toJSON(config = defaultConfig): Object {
    return this.json({type: 'directive', name: this.data.split(' ')[0].toLowerCase(), data: this.data});
  }

  public toLML(_config = defaultConfig): string {
    return `${this.data}\n`;
  }
}
