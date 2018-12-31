import { LML_TEXT_SIGN } from './const';
import { DOMNode, DOMNodeType } from './dom-node';
import { DOMNodeAttribute } from './dom-node-attribute';
import { MissingAttributeNameError, MissingAttributeValueError, UnclosedQuoteSignError, UnexpectedQuoteSignError } from './parse-error';
import { INDENTATION_REGEX } from './parse-source-file';
import { ParseSourceSpan } from './parse-source-span';
import { ParseConfig, Parser } from './parser';

interface SrcTagPart {
  line: number;
  col: number;
  src: string;
  posEq?: number;
  quotePos: number[];
}

const LINE_END_SPACES_RX = /\s*$/;

/**
 * Parsing base class. Serves HtmlParser and LmlParser
 */
export abstract class StringParser extends Parser<string> {
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

  constructor(url: string, src: string, config?: ParseConfig) {
    super(url, src, config);
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

  protected idBlockIndentation(lines = this.source.lines): number {
    let blockIndentation: number;
    for (const line of lines) {
      if (blockIndentation !== 0 && line.trim()) {
        const indentation = line.match(INDENTATION_REGEX)[0].length;

        if (blockIndentation == null || indentation < blockIndentation) {
          blockIndentation = indentation;
          if (indentation < 1) {
            return indentation;
          }
        }
      }
    }
    return blockIndentation || 0;
  }

  /**
   * Parse tag strings to separate attributes, deal with quotes etc
   * Same for HTML and LML.
   * @argument str tag source string
   * @argument line line # where tag source starts
   * @argument col col # where tag source starts
   * @argument isLML trigger LML-specific behavior
   */
  protected parseTag(str: string, line: number, col: number, isLml?: boolean): {text?: DOMNode; attrs: DOMNodeAttribute[]} {
    const len = str.length;
    const parts: SrcTagPart[] = [{src: '', line, col, quotePos: []}];
    let quote = '';
    let partCol = 0;
    let text: DOMNode;
    for (let i = 0; i < len; i++) {
      const c = str[i];
      const part = parts[parts.length - 1];
      if (quote) {
        if (c === quote && str[i - 1] !== '\\') {
          part.quotePos.push(partCol);
          quote = '';
        }
      } else if (c === '=') {
        part.posEq = partCol;
      } else if (c === '"' || c === '\'') {
        part.quotePos.push(partCol);
        quote = c;
      } else if (c === ' ' || c === '\t' || c === '\n') {
        if (c === '\n') {
          line++;
          col = 0;
        } else {
          col++;
        }
        parts.push({src: '', line, col, quotePos: []});
        partCol = 0;
        continue;
      } else if (isLml && c === LML_TEXT_SIGN) {
        text = new DOMNode('text', null, this.parseSpan(line, col, line, col + str.length - i), str.substr(i + 1));
        break;
      }
      part.src += c;
      col ++;
      partCol ++;
    }

    return {
      attrs: parts
        .filter((part, i) => part.src && (i < parts.length - 1 || part.src !== '/'))
        .map((part) => this.partToAttribute(part))
        .filter((attr) => attr),
      text
    };
  }

  /**
   * Turn tag string part info to {@link Attribute Attribute} instance
   * @argument part pre-processed part
   */
  protected partToAttribute(part: SrcTagPart): DOMNodeAttribute {
    const srcSpan = this.parseSpan(part.line, part.col, part.line, part.col + part.src.length);
    if (part.posEq == null) {
      if (part.quotePos.length) {
        const errSpan = this.parseSpan(part.line, part.col + part.quotePos[0], null, part.col + part.quotePos[0] + 1);
        this.errors.push(new UnexpectedQuoteSignError(errSpan));
      } else {
        return new DOMNodeAttribute(part.src, null, srcSpan);
      }
    } else if (part.quotePos.length) {
      const quoteStart = part.posEq === part.quotePos[0] - 1 ? 1 : 0;
      if (part.quotePos.length === 1 || !quoteStart) {
        const errSpan = this.parseSpan(part.line, part.col + part.quotePos[0], null, part.col + part.quotePos[0] + 1);
        this.errors.push(new UnclosedQuoteSignError(errSpan));
        if (part.posEq > 0) {
          if (part.posEq < part.src.length - 1) {
            const value = part.src.substring(part.posEq + 1 + quoteStart, part.src.length);
            const valSpan = this.parseSpan(part.line, part.col + part.posEq + 1 + quoteStart, part.line, part.col + part.src.length);
            return new DOMNodeAttribute(part.src.substr(0, part.posEq), value, srcSpan, valSpan);
          } else {
            return new DOMNodeAttribute(part.src.substr(0, part.posEq), null, srcSpan);
          }
        }
      } else if (part.posEq < 1) {
        this.errors.push(new MissingAttributeNameError(this.parseSpan(part.line, part.col, null, part.col + 1)));
      } else {
        const value = part.src.substring(part.quotePos[0] + 1, part.src.length - 1);
        const valSpan = this.parseSpan(part.line, part.col + part.quotePos[0] + 1, part.line, part.col + part.src.length - 1);
        return new DOMNodeAttribute(part.src.substr(0, part.posEq), value, srcSpan, valSpan);
      }
    } else {
      if (part.posEq < 1) {
        this.errors.push(new MissingAttributeNameError(this.parseSpan(part.line, part.col, null, part.col + 1)));
      } else if (part.posEq === part.src.length - 1) {
        this.errors.push(new MissingAttributeValueError(this.parseSpan(part.line, part.col, null, part.col + 1)));
        return new DOMNodeAttribute(part.src.substr(0, part.posEq), null, srcSpan);
      } else {
        const valSpan = this.parseSpan(part.line, part.col + part.posEq + 1, part.line, part.col + part.src.length);
        return new DOMNodeAttribute(part.src.substr(0, part.posEq), part.src.substring(part.posEq + 1, part.src.length), srcSpan, valSpan);
      }
    }
  }

  /**
   * Remove unnecessary data recursively
   * @argument nodes child nodes to exemine. Not passing them will trigger processing rootNodes
   */
  protected postProcess(nodes = this.rootNodes): DOMNode[] {
    for (const node of nodes) {
      if (node.type === 'element' || node.type === 'cdata') {
        this.mergeTextChildren(node);

        const children = node.children || [];

        if (node.name !== 'textarea' && node.type !== 'cdata') {
          // sanitize text indentations
          for (const child of children) {
            if (child.type === 'text') {
              const lines = (child.data || '').split('\n');
              const bi = this.idBlockIndentation(lines);
              child.data = lines.map((line) => line.substr(bi).replace(LINE_END_SPACES_RX, '')).join('\n').trim();
            }
          }

          // remove empty interconnecting text nodes
          for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            const previous = children[i - 1];
            const next = children[i + 1];
            if (child.type === 'text' && (!previous || previous.type !== 'text') && (!next || next.type !== 'text') &&
            (!child.data || !child.data.trim())) {
              children.splice(i, 1);
            }
          }
        }

        const filteredChildren = this.postProcess(node.children);
        node.children.length = 0;
        node.children.push(...filteredChildren);
      }
    }

    const filtered = nodes.filter((node) => {
      return (node.type !== 'comment' || (node.data && node.data.trim())) &&
        (node.type !== 'text' || (node.parent && node.parent.name === 'textarea') || (node.data && node.data.trim()));
    });

    if (nodes === this.rootNodes) {
      this.rootNodes.length = 0;
      this.rootNodes.push(...filtered);
    }

    return filtered;
  }
}
