import { Config, defaultConfig } from '../config';
import { orderAttributes } from '../order-attributes';
import { ParseSourceSpan } from '../parse-source-span';

import { Attribute } from './attribute';
import { Node } from './node';

/**
 * Representation of an HTML element, e.g. everything that is within `<` and ends with `>` (e.g. not {@link Text Text}),
 * except {@link CData CData}, {@link Comment Comment}, and {@link Directive Directive}.
 *
 * Resembles the @angular/compiler `Element` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/ml_parser/ast.ts}
 */
export class Element extends Node {
  /**
   * Explicit list of void HTML tags
   */
  public static voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  /**
   * Identifies void tags - e.g. everything that is not an instance of Element AND not on the list of void tags
   */
  public static isVoid(node: Node): boolean {
    return (!(node instanceof Element)) || node.name[0] === '!' || Element.voidTags.indexOf(node.name) > -1;
  }

  /**
   * @argument name Tag name
   * @argument attributes Array of element attributes
   * @argument children Array of children
   * @argument sourceSpan Full string source span (including the HTML tag or LML directive character)
   */
  constructor(public name: string, public attrs: Attribute[], public children: Node[], sourceSpan: ParseSourceSpan) {
    super(sourceSpan);
  }

  /**
   * Tag body string for HTML or LML
   * @argument config Optional output syntax configuration
   */
  public tagBody(config: Config): string {
    const attrs = orderAttributes([].concat(this.attrs), config);
    const attributes = attrs.map((attribute) => attribute.toString(config)).join(' ');
    return this.name + (attributes ? ' ' + attributes : '');
  }

  public toHtml(config = defaultConfig, tabulation = ''): string {
    let content = '';
    for (const child of (this['children'] || [])) {
      content += child.toHtml(config, tabulation + config.indentation);
    }

    const lf = config.minify ? '' : '\n';
    if (this.name === 'textarea' || this.name === 'pre') {
      return `${tabulation}<${this.tagBody(config)}>${content}</${this.name}>${lf}`;
    }
    content = content ? lf + content + tabulation : '';
    return `${tabulation}<${this.tagBody(config)}>${content}` + (content || !Element.isVoid(this) ? `</${this.name}>${lf}` : lf);
  }

  public toJSON(config = defaultConfig): Object {
    const attrs = orderAttributes([].concat(this.attrs), config);
    const attribs: {[key: string]: string} = {};
    for (const attribute of attrs) {
      attribs[attribute.name] = attribute.value || '';
    }
    const children = this.children.map((child) => child.toJSON(config)).filter((child) => !!child);
    const type = this.name === 'script' || this.name === 'style' ? this.name : 'tag';
    return this.json({type, name: this.name, attribs, children});
  }

  public toLml(config = defaultConfig, tabulation = ''): string {
    let out = `${tabulation}${this.tagBody(config)}\n`;
    for (const child of (this.children || [])) {
      out += child.toLml(config, tabulation + config.indentation);
    }
    return out;
  }
}
