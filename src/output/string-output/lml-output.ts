import { LML_SIGN, TEXT_BLOCK_ELEMENTS } from '../../const';
import { DOMNode } from '../../dom-node';
import { StringOutput } from '../string-output';

/**
 * Parses DOMNode[] to LML string
 */
export class LMLOutput extends StringOutput {
  public cdata(node: DOMNode): string {
    const childIndentation = this.indentation(node);
    const src = this.textChildren(node).map((child, i) => (i ? childIndentation : '') + this.indentMultilineData(child, false)).join('\n');
    return `${this.indentation(node)}${LML_SIGN.cdata}${src}\n`;
  }

  public comment(node: DOMNode): string {
    const str = `${this.indentation(node)}${LML_SIGN.comment} ${this.indentMultilineData(node).trim()}`;
    return this.wrapLines(str, this.indentation(node, 1)) + '\n';
  }

  public directive(node: DOMNode): string {
    return `${node.data}\n`;
  }

  public element(node: DOMNode): string {
    const indentation = this.indentation(node);
    const childIndentation = indentation + this.config.indentation;
    const tag = this.multilineTag([`${indentation}${node.name}`, ...this.attributesString(node)], childIndentation, '', '\\ ');

    if (TEXT_BLOCK_ELEMENTS.includes(node.name)) {
      const src = this.textChildren(node).map((child) => childIndentation + this.indentMultilineData(child, false)).join('\n');
      return node.name === 'textarea' || src.trim() ? `${tag}\n${src}\n` : `${tag}\n`;
    }

    const content = node.children.map((child) => this[child.type](child)).join('');
    if (content) {
      const trimmed = content.substring(childIndentation.length, content.length - 1);
      if (node.children.length === 1 && node.children[0].type === 'text' && trimmed.indexOf('\n') === -1) {
        const oneLine = `${tag} ${trimmed}`;
        if (oneLine.length <= this.config.lineWrap) {
          return `${oneLine}\n`;
        }
      }
      return `${tag}\n${content}`;
    }
    return `${tag}\n`;
  }

  public text(node: DOMNode): string {
    const str = `${this.indentation(node)}${LML_SIGN.text} ${this.indentMultilineData(node).trim()}`;
    return this.wrapLines(str, this.indentation(node, 1)) + '\n';
  }
}
