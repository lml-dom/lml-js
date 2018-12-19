import { Attribute } from './ast/attribute';
import { Element } from './ast/element';
import { Node } from './ast/node';
import { Text } from './ast/text';
import { ParseConfig, defaultOutputConfig } from './config';
import { InvalidSourceError, MissingAttributeNameError, MissingAttributeValueError, ParseError, UnclosedQuoteSignError,
  UnexpectedQuoteSignError } from './parse-error';
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

const NOT_TAB_OR_SPACE_RX = /[^ \t]/g;
const SPACE_RX = / /g;
const TAB_RX = /\t/g;

/**
 * Parsing base class. Serves HtmlParser and LmlParser
 */
export abstract class Parser {
  /**
   * Returns first parsing error if any
   */
  public get error(): ParseError {
    return this.errors[0];
  }

  /**
   * Indicates whether parsing should stop (e.g too many errors)
   */
  protected get stopParse(): boolean {
    return this.errors.length >= Math.max(+this.config.stopOnErrorCount, 1);
  }

  /**
   * Errors while parsing
   */
  public readonly errors: ParseError[] = [];

  /**
   * Top level DOM elements
   */
  public readonly rootNodes: Node[] = [];

  /**
   * Options for parsing
   */
  public config?: ParseConfig;

  /**
   * Parsing source
   */
  public source: ParseSourceFile;

  /**
   * Alias to `.toLML()`
   */
  public toString = this.toLML;

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

  /**
   * Determines whether indentation is errorous
   */
  public static validateIndentation(indentation: string): boolean {
    return !indentation.replace(NOT_TAB_OR_SPACE_RX, '').length &&
      !indentation.replace((indentation[0] === '\t' ? TAB_RX : SPACE_RX), '').length &&
      (indentation[0] !== '\t' || indentation.length === 1);
  }

  public toAST(config = defaultOutputConfig()): Object {
    return this.rootNodes.map((node) => node.toAST(config));
  }

  public toHTML(config = defaultOutputConfig()): string {
    let out = '';
    for (const child of this.rootNodes || []) {
      out += child.toHTML(config);
    }
    return out;
  }

  public toJSON(config = defaultOutputConfig()): Object {
    return this.rootNodes.map((node) => node.toJSON(config));
  }

  public toLML(config = defaultOutputConfig()): string {
    let out = '';
    for (const child of this.rootNodes || []) {
      out += child.toLML(config);
    }
    return out;
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
        if (previous.sourceSpan && child.sourceSpan) {
          previous.sourceSpan.end = child.sourceSpan.end;
        }
        children.splice(i, 1);
      }
    }
  }

  /**
   * Obtain ParseSourceSpan from start line/col and end line/col
   */
  protected parseSpan(startLine: number, startCol: number, endLine = startLine, endCol = startCol): ParseSourceSpan {
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
        const errSpan = this.parseSpan(part.line, part.col + part.quotePos[0], null, part.col + part.quotePos[0] + 1);
        this.errors.push(new UnexpectedQuoteSignError(errSpan));
      }
      return new Attribute(part.src, null, srcSpan);
    } else if (part.quotePos.length) {
      if (part.quotePos.length === 1 || part.posEq !== part.quotePos[0] - 1) {
        const errSpan = this.parseSpan(part.line, part.col + part.quotePos[0], null, part.col + part.quotePos[0] + 1);
        this.errors.push(new UnclosedQuoteSignError(errSpan));
      } if (part.quotePos.length > N_QUOTES) {
        const errSpan = this.parseSpan(part.line, part.col + part.quotePos[N_QUOTES], null, part.col + part.quotePos[N_QUOTES] + 1);
        this.errors.push(new UnexpectedQuoteSignError(errSpan));
      } else if (part.posEq < 1) {
        this.errors.push(new MissingAttributeNameError(this.parseSpan(part.line, part.col, null, part.col + 1)));
      }
      const valueSpan = this.parseSpan(part.line, part.col + part.posEq + 1 + 1, part.line, part.col + part.src.length - 1);
      return new Attribute(part.src.substr(0, part.posEq), part.src.substring(part.posEq + 1 + 1, part.src.length - 1), srcSpan, valueSpan);
    } else {
      if (part.posEq < 1) {
        this.errors.push(new MissingAttributeNameError(this.parseSpan(part.line, part.col, null, part.col + 1)));
      } else if (part.posEq === part.src.length - 1) {
        this.errors.push(new MissingAttributeValueError(this.parseSpan(part.line, part.col, null, part.col + 1)));
      }
      const valueSpan = this.parseSpan(part.line, part.col + part.posEq + 1, part.line, part.col + part.src.length);
      return new Attribute(part.src.substr(0, part.posEq), part.src.substring(part.posEq + 1, part.src.length), srcSpan, valueSpan);
    }
  }

  /** initial to-dos */
  protected preProcess(url: string, src: string, config: ParseConfig): void {
    this.config = config;
    url = typeof url === 'string' && url || '';
    if (typeof src !== 'string') {
      this.source = new ParseSourceFile('', url);
      this.errors.push(new InvalidSourceError(this.parseSpan(0, 0)));
    } else {
      this.source = new ParseSourceFile(src, url);
    }
    this._levels[-1] = new Element('root', [], this.rootNodes, this.parseSpan(0, 0, 0, 0));
  }
}
