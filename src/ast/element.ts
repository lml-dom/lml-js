import { OutputConfig, defaultOutputConfig } from '../config';
import { orderAttributes } from '../order-attributes';
import { ParseSourceSpan } from '../parse-source-span';

import { Attribute } from './attribute';
import { Node } from './node';
import { TEXT_BLOCK_ELEMENTS, Text } from './text';

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
   * Closing tag coordinates (when from HTML)
   */
  public closeTagSpan?: ParseSourceSpan;

  /**
   * Identifies void tags - e.g. everything that is not an instance of Element AND not on the list of void tags
   */
  public static isVoid(node: Node): boolean {
    return (!(node instanceof Element)) || node.name[0] === '!' || Element.voidTags.includes(node.name);
  }

  /**
   * @argument name Tag name
   * @argument attributes Array of element attributes
   * @argument children Array of children
   * @argument sourceSpan Full string source span (including the HTML tag or LML directive character)
   */
  constructor(public name: string, public attrs: Attribute[], public children: Node[], sourceSpan?: ParseSourceSpan) {
    super(sourceSpan);
  }

  /**
   * Tag body string for HTML or LML
   * @argument config Optional output syntax configuration
   */
  public tagBody(config: OutputConfig, tabulation: string | false, type: 'html' | 'lml'): string {
    const lines: string[] = [`${tabulation || ''}${type === 'html' ? '<' : ''}${this.name}`];
    for (const attribute of orderAttributes([].concat(this.attrs), config)) {
      const attr = attribute.toString();
      const lineNum = lines.length - 1;
      if (tabulation !== false && lines[lineNum].length + 1 + attr.length + (type === 'html' ? 1 : 0) > config.lineWrap) {
        lines.push(`${tabulation + config.indentation}${type === 'lml' ? '\\ ' : ''}${attr}`);
      } else {
        lines[lineNum] += ` ${attr}`;
      }
    }
    return lines.join('\n') + (type === 'html' ? '>' : '');
  }

  public toAST(config = defaultOutputConfig()): Object {
    const attrs = orderAttributes([].concat(this.attrs), config);
    const attribs: {[key: string]: string} = {};
    for (const attribute of attrs) {
      attribs[attribute.name] = attribute.value || '';
    }
    const children = this.children.map((child) => child.toAST(config)).filter((child) => !!child);
    const type = this.name === 'script' || this.name === 'style' ? this.name : 'tag';
    return this.astInfo({type, name: this.name, attribs, children});
  }

  public toHTML(config = defaultOutputConfig(), tabulation = ''): string {
    let content = '';
    for (const child of (this['children'] || [])) {
      content += child.toHTML(config, tabulation + config.indentation);
    }

    const lf = config.minify ? '' : '\n';
    if (this.name === 'textarea') {
      return `${tabulation}${this.tagBody(config, false, 'html')}${content}</${this.name}>${lf}`;
    }
    const tag = this.tagBody(config, tabulation, 'html');
    const closingTag = content || !Element.isVoid(this) ? `</${this.name}>` : '';
    if (content) {
      const trimmed = content.substring((tabulation + config.indentation).length, content.length - 1);
      if (this.children.length > 1 || (this.children.length === 1 && this.children[0]['children'] && this.children[0]['children'].length) ||
        (tag + content + closingTag).length > config.lineWrap || content.substr(0, content.length - 1).includes('\n')
      ) {
        content = lf + content + tabulation;
      } else {
        content = trimmed;
      }
    }
    return `${tag}${content}${closingTag}${lf}`;
  }

  public toJSON(config = defaultOutputConfig()): Object {
    const attributes = orderAttributes([].concat(this.attrs), config).map((attrib) => attrib.toJSON());
    const children = this.children.map((child) => child.toJSON(config)).filter((child) => !!child);
    return {type: 'element', name: this.name, attributes, children};
  }

  public toLML(config = defaultOutputConfig(), tabulation = ''): string {
    const indentChild = tabulation + config.indentation;
    let out = this.tagBody(config, tabulation, 'lml') + '\n';
    (this.children || []).forEach((child, i) => {
      const content = child.toLML(config, indentChild);
      if (!i && child instanceof Text && !TEXT_BLOCK_ELEMENTS.includes(this.name)) {
        let line = out.substr(0, out.length - 1);
        if (!line.includes('\n') && !content.substr(0, content.length - 1).includes('\n')) {
          line = `${line} ${content.substr(indentChild.length)}`;
          if (line.split('\n')[0].length <= config.lineWrap) {
            out = line;
            return;
          }
        }
      }
      out += content;
    });
    return out;
  }
}
