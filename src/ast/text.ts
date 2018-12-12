import { defaultConfig } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

import { Element } from './element';
import { Node } from './node';

export const CHARACTER_SAFE_ELEMENTS = ['cdata', 'pre', 'textarea'];
export const TEXT_BLOCK_ELEMENTS = ['pre', 'script', 'style', 'textarea'];

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
    if (this.parent && CHARACTER_SAFE_ELEMENTS.indexOf(this.parent.name) > -1) {
      return this.data || '';
    }

    const indent = tabulation.substr(0, tabulation.length - config.indentation.length);
    const data = (this.data || '').trim();
    if (data && this.parent && (this.parent.name === 'script' || this.parent.name === 'style')) {
      return `${this.multilineIndentation(data, config, indent, true, this.parent.name === 'script')}\n`;
    }
    return (config.minify ? '' : tabulation) + this.multilineIndentation(data, config, indent) + (config.minify ? '' : '\n');
  }

  public toJSON(_config = defaultConfig): Object {
    const data = this._sanitizedValue;
    return data ? this.json({type: 'text', data}) : null;
  }

  public toLml(config = defaultConfig, tabulation = ''): string {
    const data = this._sanitizedValue;
    if (!data) {
      return '';
    } else if (this.parent && TEXT_BLOCK_ELEMENTS.indexOf(this.parent.name) > -1) {
      const indent = tabulation.substr(0, tabulation.length - config.indentation.length);
      return `${this.multilineIndentation(data, config, indent, true)}\n`;
    }
    return `${tabulation}; ${this.multilineIndentation(data, config, tabulation)}\n`;
  }

  /**
   * Trimmed value for text nodes where parent element doesn't require value safety (e.g. except `textarea` and `pre`)
   */
  private get _sanitizedValue(): string {
    return CHARACTER_SAFE_ELEMENTS.indexOf(this.parent.name) > -1 ? (this.data || '') : (this.data || '').trim();
  }
}
