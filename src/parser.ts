import { Attribute } from './ast/attribute';
import { Element } from './ast/element';
import { Node } from './ast/node';
import { Text } from './ast/text';
import { Config, defaultConfig } from './config';
import { ParseError } from './parse-error';
import { ParseLocation } from './parse-location';
import { ParseSourceFile } from './parse-source-file';
import { ParseSourceSpan } from './parse-source-span';

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
   * Errors while parsing
   */
  public readonly errors: ParseError[] = [];

  /**
   * Top level DOM elements
   */
  public readonly rootNodes: Node[] = [];

  /**
   * Parsing source
   */
  public readonly source: ParseSourceFile;

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
  protected _levels: Element[] = [];

  constructor(url: string, src: string, public readonly config?: Config) {
    url = typeof url === 'string' && url || '';
    if (typeof src !== 'string') {
      this.source = new ParseSourceFile('', url);
      this.parseError(0, 0, 0, 'Missing or invalid source');
    } else {
      this.source = new ParseSourceFile(src, url);
    }
    this._levels[-1] = new Element('root', [], this.rootNodes, this.parseSpan(0, 0, 0, 0));
    this.parse();
  }

  /**
   * Returns first parsing error if any
   */
  public get error(): ParseError {
    return this.errors[0];
  }

  public toHtml(config = defaultConfig): string {
    let out = '';
    for (const child of this.rootNodes || []) {
      out += child.toHtml(config);
    }
    return out;
  }

  public toJSON(config = defaultConfig): Object {
    return this.rootNodes.map((node) => node.toJSON(config));
  }

  public toLml(config = defaultConfig): string {
    let out = '';
    for (const child of this.rootNodes || []) {
      out += child.toLml(config);
    }
    return out;
  }

  /**
   * Indicates whether parsing should stop (e.g too many errors)
   */
  protected get stopParse(): boolean {
    const errorLimit = this.config.stopOnErrorCount || defaultConfig.stopOnErrorCount || 1;
    return this.errors.length >= errorLimit;
  }

  /**
   * Add a node, set parent, mark as last, update level-related info
   */
  protected add(node: Node, level: number): void {
    if (node) {
      this._levels.length = level;
      this._lastLevel = level;
      node.parent = this._levels[level - 1];
      this._last = this._levels[level] = <Element>node;
    }
  }

  /**
   * Handle consecutive text nodes as one
   */
  protected mergeTextChildren(node: Element): void {
    const children = node.children || [];
    for (let i = children.length - 1; i > 0; i--) {
      const child = children[i];
      const previous = children[i - 1];
      if (child instanceof Text && previous instanceof Text) {
        previous.data += child.data;
        previous.sourceSpan.end = child.sourceSpan.end;
        children.splice(i, 1);
      }
    }
  }

  /**
   * Parsing. Called directly from constructor.
   */
  protected abstract parse(): void;

  /**
   * Add ParseError around span in a standard way
   */
  protected parseError(line: number, startCol: number, endCol: number, msg: string): void {
    this.errors.push(new ParseError(this.parseSpan(line, startCol, line, endCol), msg));
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
  protected parseTag(str: string, line: number, col: number, isLml?: boolean): {text?: Text; attrs: Attribute[]} {
    const len = str.length;
    const parts: SrcTagPart[] = [{src: '', line, col, quotePos: []}];
    let quote = '';
    let partCol = 0;
    let text: Text;
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
      } else if (isLml && c === ';') {
        text = new Text(str.substr(i + 1), this.parseSpan(line, col, line, col + str.length - i));
        break;
      }
      part.src += c;
      col ++;
      partCol ++;
    }

    return {
      attrs: parts.filter((part, i) => part.src && (i < parts.length - 1 || part.src !== '/')).map((part) => this.partToAttribute(part)),
      text
    };
  }

  /**
   * Turn tag string part info to {@link Attribute Attribute} instance
   */
  protected partToAttribute(part: SrcTagPart): Attribute {
    const srcSpan = this.parseSpan(part.line, part.col, part.line, part.col + part.src.length);
    if (part.posEq == null) {
      if (part.quotePos.length) {
        this.parseError(part.line, part.col + part.quotePos[0], part.col + part.quotePos[0] + 1, 'Unexpected quote sign.');
      }
      return new Attribute(part.src, '', srcSpan);
    } else if (part.quotePos.length) {
      if (part.quotePos.length === 1) {
        this.parseError(part.line, part.col + part.quotePos[0], part.col + part.quotePos[0] + 1, 'Unclosed quote sign.');
      } if (part.quotePos.length > N_QUOTES) {
        this.parseError(part.line, part.col + part.quotePos[N_QUOTES], part.col + part.quotePos[N_QUOTES] + 1, 'Unexpected quote sign.');
      } else if (part.quotePos.length === 1) {
        this.parseError(part.line, part.col + part.quotePos[0], part.col + part.quotePos[0] + 1, 'Unclosed quote sign.');
      } else if (part.posEq !== part.quotePos[0] - 1) {
        this.parseError(part.line, part.col + part.quotePos[0], part.col + part.quotePos[0] + 1, 'Quote must be preceded by `=`.');
      } else if (part.posEq < 1) {
        this.parseError(part.line, part.col, part.col + 1, 'Missing attribute name.');
      }
      const valueSpan = this.parseSpan(part.line, part.col + part.posEq + 1 + 1, part.line, part.col + part.src.length - 1);
      return new Attribute(part.src.substr(0, part.posEq), part.src.substring(part.posEq + 1 + 1, part.src.length - 1), srcSpan, valueSpan);
    } else {
      if (part.posEq < 1) {
        this.parseError(part.line, part.col, part.col + 1, 'Missing attribute name.');
      } else if (part.posEq === part.src.length - 1) {
        this.parseError(part.line, part.col, part.col + 1, 'Missing attribute value.');
      }
      const valueSpan = this.parseSpan(part.line, part.col + part.posEq + 1, part.line, part.col + part.src.length);
      return new Attribute(part.src.substr(0, part.posEq), part.src.substring(part.posEq + 1, part.src.length), srcSpan, valueSpan);
    }
  }
}
