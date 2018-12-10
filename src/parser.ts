import { Attribute } from './ast/attribute';
import { Element } from './ast/element';
import { Node } from './ast/node';
import { Config } from './config';
import { ParseError } from './parse-error';
import { ParseLocation } from './parse-location';
import { ParseSourceFile } from './parse-source-file';
import { ParseSourceSpan } from './parse-source-span';
import { ParseTreeResult } from './parse-tree-result';

interface SrcTagPart {
  line: number;
  col: number;
  src: string;
  posEq?: number;
  quotePos: number[];
}

const N_QUOTES = 2;

/**
 * Parsing base class. Serves HtmlParser and LmlParser
 */
export abstract class Parser {
  /**
   * Parsing source
   */
  public readonly source: ParseSourceFile;

  /**
   * AST / parse result container
   */
  public ast = new ParseTreeResult([], []);

  /**
   * Last node that was parsed
   */
  protected _last: Node;

  /**
   * Last node's level. Helps ID'ing parents
   */
  protected _lastLevel: number;

  /**
   * References of potential parents on each level
   */
  protected _levels: Element[];

  constructor(url: string, src: string, public readonly config?: Config) {
    this.source = new ParseSourceFile(src, url);
    this._levels = [];
    this._levels[-1] = new Element('root', [], this.ast.rootNodes, this.parseSpan(0, 0, 0, 0));
    this.parse();
  }

  /**
   * Add a node, set parent, mark as last, update level-related info
   */
  protected add(node: Node, level: number): void {
    this._levels.length = level;
    this._lastLevel = level;
    node.parent = this._levels[level - 1];
    this._last = this._levels[level] = <Element>node;
  }

  /**
   * Parsing. Called directly from constructor.
   */
  protected abstract parse(): void;

  /**
   * Add ParseError around span in a standard way
   */
  protected parseError(line: number, startCol: number, endCol: number, msg: string): void {
    this.ast.errors.push(new ParseError(this.parseSpan(line, startCol, line, endCol), msg));
  }

  /**
   * Obtain ParseSourceSpan from start line/col and end line/col
   */
  protected parseSpan(startLine: number, startCol: number, endLine: number, endCol: number): ParseSourceSpan {
    const start = new ParseLocation(this.source, null, startLine, startCol);
    const end = new ParseLocation(this.source, null, endLine, endCol);
    return new ParseSourceSpan(start, end);
  }

  /**
   * Parse tag strings to separate attributes, deal with quotes etc
   * Same for HTML and LML.
   */
  protected parseTag(str: string, line: number, col: number): Attribute[] {
    const len = str.length;
    const parts: SrcTagPart[] = [{src: '', line, col, quotePos: []}];
    let quote = '';
    let partCol = 0;
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
      }
      part.src += c;
      col ++;
      partCol ++;
    }
    return parts.filter((part) => part.src && part.src !== '/').map((part) => this.partToAttribute(part));
  }

  /**
   * Turn tag string part info to {@link Attribute Attribute} instance
   */
  protected partToAttribute(part: SrcTagPart): Attribute {
    const srcSpan = this.parseSpan(part.line, part.col, part.line, part.col + part.src.length);
    if (part.posEq == null) {
      if (part.quotePos.length) {
        this.parseError(part.line, part.col + part.quotePos[0], part.col + part.quotePos[0] + 1, 'Unexpected quote sign');
      }
      return new Attribute(part.src, '', srcSpan);
    } else if (part.quotePos.length) {
      if (part.quotePos.length === 1) {
        this.parseError(part.line, part.col + part.quotePos[0], part.col + part.quotePos[0] + 1, 'Unclosed quote sign');
      } else if (part.quotePos.length > N_QUOTES) {
        this.parseError(part.line, part.col + part.quotePos[N_QUOTES], part.col + part.quotePos[N_QUOTES] + 1, 'Unexpected quote sign');
      } else if (part.quotePos.length === 1) {
        this.parseError(part.line, part.col + part.quotePos[0], part.col + part.quotePos[0] + 1, 'Unclosed quote sign');
      }
      const valueSpan = this.parseSpan(part.line, part.col + part.posEq + 1 + 1, part.line, part.col + part.src.length - 1);
      return new Attribute(part.src.substr(0, part.posEq), part.src.substring(part.posEq + 1 + 1, part.src.length - 1), srcSpan, valueSpan);
    } else {
      const valueSpan = this.parseSpan(part.line, part.col + part.posEq + 1, part.line, part.col + part.src.length);
      return new Attribute(part.src.substr(0, part.posEq), part.src.substring(part.posEq + 1, part.src.length), srcSpan, valueSpan);
    }
  }
}
