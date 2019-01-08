import { MIN_AVAILABLE_CHARS_BEFORE_LINE_WRAP } from '../const';
import { DOMNode } from '../dom-node';
import { DOMNodeAttribute } from '../dom-node-attribute';
import { Output } from '../output';
import { OutputConfig } from '../output-config.d';
import { InvalidConfigurationError } from '../parser/parse-error';
import { validateIndentationConfig } from '../validate-indentation-config';

const LINE_WRAP_MIN = 40;
const wrapRx: RegExp[] = [];

/**
 * String output (LML or HTML) base class
 */
export abstract class StringOutput extends Output<string> {
  constructor(nodes: DOMNode[], config?: OutputConfig) {
    super(nodes, config);
    this.config.lineWrap = Math.max(LINE_WRAP_MIN, +this.config.lineWrap);
    if (!validateIndentationConfig(this.config.indentation)) {
      throw new InvalidConfigurationError('Invalid output indentation');
    }
  }

  public convert(nodes = this.nodes): string {
    return nodes.map((node) => this[node.type](node)).join('');
  }

  /**
   * Get indentation string for node
   * @argument node unit to indent
   * @argument levelDelta add or remove level of indententation
   */
  public indentation(node: DOMNode, levelDelta = 0): string {
    return this.config.indentation.repeat(node.level + levelDelta);
  }

  /**
   * Attribute string for HTML or LML
   * @argument node parent node
   */
  public attributesString(node: DOMNode): string[] {
    return DOMNodeAttribute.sort(node.attributes, this.config.orderAttributes).map((attribute) => attribute.toString());
  }

  /**
   * Indent multiline node data string (for text or comment)
   * @argument node data container node
   * @argument pushAsChild defines text hierarchy. Defaults to push 1 level.
   */
  protected indentMultilineData(node: DOMNode, pushAsChild = true): string {
    const childIndentation = this.indentation(node, pushAsChild ? 1 : 0);
    return node.data.split('\n').map((line, i) => i ? childIndentation + line : line).join('\n');
  }

  /**
   * Put a long tag to multiple lines
   * @argument parts tag name + attribute strings in an array
   * @argument indentation indentation from second line on
   * @argument concatenator character to prefix new line with (LML: '\ ')
   */
  protected multilineTag(parts: string[], indentation: string, pre = '', concatenator = ''): string {
    let lastLine = '';
    let str = pre;
    parts.forEach((part, i) => {
      if (lastLine.length + part.length + 1 > this.config.lineWrap) {
        lastLine = indentation + concatenator + part;
        str += '\n' + lastLine;
      } else {
        if (i) {
          lastLine += ' ';
          str += ' ';
        }
        lastLine += part;
        str += part;
      }
    });
    return str;
  }

  /**
   * Indent multiline node data string (for text or comment)
   */
  protected wrapLines(value: string, childIndentation: string): string {
    const childIndentationLen = childIndentation.length;
    const wrap = Math.max(+this.config.lineWrap - childIndentationLen, MIN_AVAILABLE_CHARS_BEFORE_LINE_WRAP);
    (wrapRx[wrap] = wrapRx[wrap] || new RegExp(`(?![^\\n]{1,${wrap}}$)([^\\n]{1,${wrap}})\\s\\s*`, 'g'));
    return value.substr(0, childIndentationLen) + value.substr(childIndentationLen).replace(wrapRx[wrap], '$1\n' + childIndentation);
  }
}
