import { TEXT_BLOCK_ELEMENTS } from '../../const';
import { DOMNode } from '../../dom-node';
import { StringOutput } from '../string-output';

/**
 * Parses DOMNode[] to HTML string
 */
export class HTMLOutput extends StringOutput {
  public cdata(node: DOMNode): string {
    return `${this.indentation(node)}<![CDATA[${this.textChildrenString(node)}]]>${this.lf}`;
  }

  public comment(node: DOMNode): string {
    if (this.config.minify) {
      return '';
    }
    const str = `${this.indentation(node)}<!-- ${this.indentMultilineData(node).trim()} -->`;
    return this.wrapLines(str, this.indentation(node, 1)) + '\n';
  }

  public directive(node: DOMNode): string {
    return `<${node.data}>\n`;
  }

  public element(node: DOMNode): string {
    const indentation = this.indentation(node);
    const childIndentation = indentation + this.config.indentation;
    const parts = [`${indentation}<${node.name}`, ...this.attributesString(node)];
    parts[parts.length - 1] += '>';
    const tag = this.multilineTag(parts, childIndentation);

    if (node.name === 'textarea') {
      return `${tag}${this.textChildrenString(node)}</${node.name}>${this.lf}`;
    }

    const content = node.children.map((child) => this[child.type](child)).join('');
    const closingTag = content || !DOMNode.voidTags.includes(node.name) ? `</${node.name}>` : '';
    if (content) {
      if (!this.config.minify && !TEXT_BLOCK_ELEMENTS.includes(node.name) &&
        node.children.length === 1 && !node.children[0].children.length
      ) {
        const trimmed = content.substring(childIndentation.length, content.length - 1);
        if (trimmed.indexOf('\n') === -1) {
          const oneLine = `${tag}${trimmed}${closingTag}`;
          if (oneLine.length <= this.config.lineWrap) {
            return `${oneLine}\n`;
          }
        }
      }
      return `${tag}${this.lf}${content}${indentation}${closingTag}${this.lf}`;
    }
    return `${tag}${closingTag}${this.lf}`;
  }

  public text(node: DOMNode): string {
    if (this.config.minify) {
      return (node.data || '').trim();
    }
    const indentation = this.indentation(node);
    return this.wrapLines(`${indentation}${this.indentMultilineData(node).trim()}`, indentation) + '\n';
  }

  /**
   * Line-feed (enter) character in normal, or empty string minification mode
   */
  private get lf(): string {
    return this.config.minify ? '' : '\n';
  }
}
