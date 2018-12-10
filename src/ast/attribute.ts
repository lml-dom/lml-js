import { defaultConfig } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

/**
 * Attribute of an HTML tag
 * Resembles the @angular/compiler `Attribute` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/ml_parser/ast.ts}
 */
export class Attribute {
  /**
   * @argument name Attribute name (e.g. `class` in `class="x y z"`)
   * @argument value Attribute value (e.g. `x y z` in `class="x y z"`). Empty string for void attribute (e.g. `<div hidden></div>`)
   * @argument sourceSpan Source full string span (includes name, value, quotes etc)
   * @argument valueSpan Source value string span (includes value, excluding quotes)
   */
  constructor(public name: string, public value: string, public sourceSpan: ParseSourceSpan, public valueSpan?: ParseSourceSpan) {}

  /**
   * Stringify an attribute to HTML or LML syntax
   * @argument _config Optional configuration
   */
  public toString(_config = defaultConfig): string {
    let str = this.name;
    if (this.value) {
      const quote = this.value.indexOf('"') > -1 && this.value.indexOf('\'') === -1 ? '\'' : '"';
      str += `=${quote + this.value + quote}`;
    }
    return str;
  }
}
