import { defaultOutputConfig } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

import { Node } from './node';

/**
 * Representation of the HTML `<!-- -->` tag
 * Resembles the @angular/compiler `Comment` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/ml_parser/ast.ts}
 */
export class Comment extends Node {
  /**
   * Directive character to identify Comment
   */
  public static readonly LML_DIRECTIVE = '#';

  /**
   * @argument data Text content
   * @argument sourceSpan Full string source span (including the HTML tag or LML directive character)
   */
  constructor(public data: string, sourceSpan?: ParseSourceSpan) {
    super(sourceSpan);
  }

  public toHTML(config = defaultOutputConfig(), tabulation = ''): string {
    return config.minify ? '' : `${tabulation}<!-- ${this.multilineIndentation(this.data, config, tabulation)} -->\n`;
  }

  public toJSON(_config = defaultOutputConfig()): Object {
    return {type: 'comment', data: this.data};
  }

  public toLML(config = defaultOutputConfig(), tabulation = ''): string {
    return `${tabulation}${Comment.LML_DIRECTIVE} ${this.multilineIndentation(this.data, config, tabulation)}\n`;
  }

  /**
   * Comments are not value safe
   */
  protected get lineWrap(): boolean {
    return true;
  }
}
