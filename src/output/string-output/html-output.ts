import { TEXT_BLOCK_ELEMENTS } from '../../const';
import { DOMNode } from '../../dom-node';
import { OutputConfig } from '../../output-config';
import { StringOutput } from '../string-output';

/**
 * Parses DOMNode[] to HTML string
 */
export class HTMLOutput extends StringOutput {
  constructor(nodes: DOMNode[], config?: OutputConfig) {
    super(nodes, config);
    if (this.config.minify) {
      this.config.indentation = '';
    }
  }

  public cdata(node: DOMNode): string {
    return `${this.indentation(node)}<![CDATA[${this.textChild(node).data}]]>${this.lf}`;
  }

  public comment(node: DOMNode): string {
    if (this.config.minify) {
      return '';
    }
    const str = `${this.indentation(node)}<!-- ${this.indentMultilineData(node).trim()} -->`;
    return this.wrapLines(str, this.indentation(node, 1)) + '\n';
  }

  public directive(node: DOMNode): string {
    return `<${node.data}>${this.lf}`;
  }

  public element(node: DOMNode): string {
    const indentation = this.indentation(node);
    const childIndentation = indentation + this.config.indentation;
    const parts = [`${indentation}<${node.name}`, ...this.attributesString(node)];
    parts[parts.length - 1] += '>';
    const tag = this.multilineTag(parts, childIndentation);

    if (node.name === 'textarea') {
      return `${tag}${this.textChild(node).data}</${node.name}>${this.lf}`;
    } else if (TEXT_BLOCK_ELEMENTS.includes(node.name)) {
      const src = this.indentMultilineData(this.textChild(node), false);
      if (src) {
        if (src.indexOf('\n') === -1) {
          const oneLine = `${tag}${src}</${node.name}>`;
          if (oneLine.length <= this.config.lineWrap) {
            return `${oneLine}${this.lf}`;
          }
        }
        return `${tag}${this.lf}${childIndentation}${src}${this.lf}${indentation}</${node.name}>${this.lf}`;
      }
      return `${tag}</${node.name}>${this.lf}`;
    }

    const content = node.children.map((child) => this[child.type](child)).join('');
    const closingTag = content || !DOMNode.voidTags.includes(node.name) ? `</${node.name}>` : '';
    if (content) {
      if (!this.config.minify && node.children.length === 1 && !node.children[0].children.length) {
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
      return node.data.trim();
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
