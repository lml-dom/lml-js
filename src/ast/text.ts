import { defaultConfig } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

import { Node } from './node';

/**
 * Text node in HTML
 * Resembles the @angular/compiler `Text` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/ml_parser/ast.ts}
 */
export class Text extends Node {
  /**
   * Directive character to identify Text.
   */
  public static readonly LML_DIRECTIVE = ';';

  /**
   * @argument data Text value
   * @argument sourceSpan Text source span
   */
  constructor(public data: string, sourceSpan: ParseSourceSpan) {
    super(sourceSpan);
  }

  public toHtml(config = defaultConfig, tabulation = ''): string {
    const data = (this.data || '').trim();
    if (!data) {
      return '';
    }
    return data + (config.minify ? '' : '\n');
  }

  public toJSON(_config = defaultConfig): Object {
    const data = (this.data || '').trim();
    return data ? this.json({type: 'text', data}) : null;
  }

  public toLml(config = defaultConfig, tabulation = '', textOnly = false): string {
    const data = (this.data || '').trim();
    if (!data) {
      return '';
    } else if (textOnly) {
      return `${this.lmlMultilineIndentation(data, config, tabulation.substr(0, tabulation.length - config.indentation.length), true)}\n`;
    }
    return `${tabulation}; ${this.lmlMultilineIndentation(data, config, tabulation)}\n`;
  }
}
