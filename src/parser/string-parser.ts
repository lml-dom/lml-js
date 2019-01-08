import { LML_TEXT_SIGN } from '../const';
import { DOMNode, DOMNodeType } from '../dom-node';
import { DOMNodeAttribute } from '../dom-node-attribute';
import { Parser } from '../parser';
import { ParseConfig } from '../parser-config.d';

import { InvalidSourceError } from './parse-error';
import { ParseSourceFile } from './parse-source-file';
import { ParseSourceSpan } from './parse-source-span';
import { InvalidAttributeNameWarning, InvalidAttributeValueWarning, InvalidQuoteSignWarning } from './parse-warning';

/**
 * Parsing base class. Serves HtmlParser and LmlParser
 */
export abstract class StringParser extends Parser {
  /**
   * Last node that was parsed
   */
  protected _last: DOMNode;

  /**
   * Cache of last level used
   */
  protected _lastLevel = 0;

  /**
   * Cache of potential parents
   */
  protected _levels: DOMNode[];

  /**
   * Instantiation triggers parsing
   * @argument src Parsable source string or JSON-style object
   * @argument config Optional input parsing configuration overrides
   */
  constructor(src: string, config?: ParseConfig) {
    super();
    this.config = {...this.config, ...(config || {})};
    if (typeof src !== 'string') {
      throw new InvalidSourceError();
    }
    this.source = new ParseSourceFile(src, this.config.url);
    this.parse();
    this.postProcess();
  }

  /**
   * Create node and add to tree
   * @argument type new node type
   * @argument level hierarchy level to inject new node to
   * @argument sourceSpan optional source start/end def
   * @argument data optional text data for comment/
   */
  protected add(type: DOMNodeType, level: number, sourceSpan: ParseSourceSpan, data?: string): DOMNode {
    this._lastLevel = level;
    const node = new DOMNode(type, this._levels[level - 1], sourceSpan, data);
    if (level < 1) {
      this.rootNodes.push(node);
    }
    return this._levels[level] = this._last = node;
  }

  /**
   * Parse tag strings to separate attributes, deal with quotes etc
   * Same for HTML and LML.
   * @argument span source span
   * @argument attributes array to load found attributes to
   * @argument isLML trigger LML-specific behavior
   * @return text node if isLML is passed and inline text is found
   */
  protected parseTag(span: ParseSourceSpan, attributes: DOMNodeAttribute[], isLML?: boolean): DOMNode {
    const str = this.source.content.substring(span.start.offset, span.end.offset);
    const attrs: DOMNodeAttribute[] = [];
    let current: DOMNodeAttribute;
    let text: DOMNode;
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const c = str.charAt(i);
      if (current) {
        if (!current.eqPos) { // attribute name mode
          if (c === '=') { // value starts after this
            current.eqPos = span.start.off(i);
            current.sourceSpan.end = span.start.off(i + 1);
          } else if (isLML && c === LML_TEXT_SIGN) { // LML inline text
            text = new DOMNode('text', null, span.off(i, len - i), str.substr(i + 1));
            break;
          } else if (c !== ' ' && c !== '\t' && c !== '\n') { // non-whitespace
            if (span.start.offset + i !== current.sourceSpan.end.offset) { // there was white space before => new attribute
              attrs.push(current = new DOMNodeAttribute(c, null, span.off(i, 1)));
            } else {
              current.name += c;
              current.sourceSpan.end = span.start.off(i + 1);
            }
          }
        } else { // value mode
          if (!current.quote) { // no quote yet
            if (isLML && c === LML_TEXT_SIGN) { // LML inline text
              text = new DOMNode('text', null, span.off(i, len - i), str.substr(i + 1));
              break;
            } else {
              current.sourceSpan.end = span.start.off(i + 1);
              if (!current.valueSpan) { // no value yet, just `=` before
                if (c === '"' || c === '\'') { // starts with quote
                  current.quote = c;
                  current.value = '';
                  current.valueSpan = span.off(i, 1);
                } else if (c !== ' ' && c !== '\t' && c !== '\n') { // unquoted value
                  current.value = c;
                  current.valueSpan = span.off(i, 1);
                }
              } else { // value continuation
                if (c !== ' ' && c !== '\t' && c !== '\n') { // adding unquoted character
                  current.value += c;
                  current.valueSpan.end = span.start.off(i + 1);
                } else { // whitespace is the end of an unquoted value
                  current = null;
                }
              }
            }
          } else { // quoted value
            current.sourceSpan.end = span.start.off(i + 1);
            current.valueSpan.end = span.start.off(i + 1);
            if (c === current.quote) { // finishing quote - end of attribute
              current = null;
            } else {
              current.value += c;
              current.valueSpan.end = span.start.off(i + 1);
            }
          }
        }
      } else if (isLML && c === LML_TEXT_SIGN) { // LML inline text
        text = new DOMNode('text', null, span.off(i, len - i), str.substr(i + 1));
        break;
      } else if (c !== ' ' && c !== '\t' && c !== '\n') { // not a whitespace => new attribute
        attrs.push(current = new DOMNodeAttribute(c === '=' ? '' : c, null, span.off(i, 1)));
        if (c === '=') {
          current.eqPos = span.start.off(i);
        }
      }
    }
    attributes.push(...attrs.filter((attr) => this.attributeErrorCheck(attr)));
    if (current && current.quote) {
      this.errors.push(new InvalidQuoteSignWarning(current.valueSpan.off(0, 1)));
    }
    return text;
  }

  /**
   * Generate errors, check if attribute should be added
   * @argument attribute pre-processed attribute
   * @return true if attribute can be added
   */
  protected attributeErrorCheck(attr: DOMNodeAttribute): boolean {
    if (!attr.name || typeof attr.name !== 'string' || attr.name.indexOf('\'') > -1 || attr.name.indexOf('"') > -1) {
      this.errors.push(new InvalidAttributeNameWarning(attr.sourceSpan.off(0, ((attr.name || '').length || 1))));
      return false;
    }
    if (attr.eqPos && !attr.value && !attr.quote) {
      this.errors.push(new InvalidAttributeValueWarning(new ParseSourceSpan(attr.eqPos, attr.eqPos.off(1))));
    }
    if (!attr.quote && attr.value && (attr.value.indexOf('\'') > -1 || attr.value.indexOf('"') > -1)) {
      this.errors.push(new InvalidQuoteSignWarning(attr.valueSpan));
    }
    return true;
  }
}
