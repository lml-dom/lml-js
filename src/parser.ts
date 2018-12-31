import { ASTModel } from './ast-model';
import { ASTOutput } from './ast-output';
import { DOMNode } from './dom-node';
import { HTMLOutput } from './html-output';
import { JSONModel } from './json-model';
import { JSONOutput } from './json-output';
import { LMLOutput } from './lml-output';
import { OutputConfig } from './output';
import { InvalidSourceError, ParseError } from './parse-error';
import { ParseLocation } from './parse-location';
import { ParseSourceFile } from './parse-source-file';
import { ParseSourceSpan } from './parse-source-span';

export interface ParseConfig {
  indentation?: string;
  stopOnErrorCount?: number;
}

const NOT_TAB_OR_SPACE_RX = /[^ \t]/g;
const SPACE_RX = / /g;
const TAB_RX = /\t/g;

/**
 * Parsing base class. Serves HtmlParser and LmlParser
 */
export abstract class Parser<TSource> {
  /**
   * Default configuration for parsing
   */
  public static defaultConfig: ParseConfig = {stopOnErrorCount: 20};

  /**
   * Parse modifier options
   */
  public readonly config: ParseConfig = {...Parser.defaultConfig};

  /**
   * Errors while parsing
   */
  public readonly errors: ParseError[] = [];

  /**
   * Top level DOM elements
   */
  public readonly rootNodes: DOMNode[] = [];

  /**
   * Parsing source
   */
  public source: ParseSourceFile;

  /**
   * JSON/AST source
   */
  protected srcObj: TSource[];

  /**
   * Determines whether indentation is errorous
   * @argument indentation spaces or tabs to validate
   */
  public static validateIndentation(indentation: string): boolean {
    return !indentation.replace(NOT_TAB_OR_SPACE_RX, '').length &&
      !indentation.replace((indentation[0] === '\t' ? TAB_RX : SPACE_RX), '').length &&
      (indentation[0] !== '\t' || indentation.length === 1);
  }

  /**
   * Instantiation triggers parsing
   * @argument url Source file path
   * @argument src Parsable source string or JSON-style object
   * @argument config Optional input parsing configuration overrides
   */
  constructor(url: string, src: TSource[] | string, config?: ParseConfig) {
    this.config = {...this.config, ...(config || {})};
    url = typeof url === 'string' && url || '';
    if (typeof src !== 'string') {
      let str: string;
      this.srcObj = <TSource[]>src;
      try {
        str = JSON.stringify(src);
      } catch (err) {
        this.errors.push(new InvalidSourceError(null, String(err)));
      }
      this.source = new ParseSourceFile(str, url);
    } else {
      this.source = new ParseSourceFile(src, url);
    }

    this.parse();
  }

  /**
   * Returns first parsing error if any
   */
  public get error(): ParseError {
    return this.errors[0];
  }

  /**
   * Convert to AST
   * @argument config output modifiers
   */
  public toAST(config?: OutputConfig): ASTModel[] {
    return (new ASTOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to HTML
   * @argument config output modifiers
   */
  public toHTML(config?: OutputConfig): string {
    return (new HTMLOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to JSON
   * @argument config output modifiers
   */
  public toJSON(config?: OutputConfig): JSONModel[] {
    return (new JSONOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to LML
   * @argument config output modifiers
   */
  public toLML(config?: OutputConfig): string {
    return (new LMLOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to LML (alias)
   * @argument config output modifiers
   */
  public toString(config?: OutputConfig): string {
    return this.toLML(config);
  }

  /**
   * Indicates whether parsing should stop (e.g too many errors)
   */
  protected get stopParse(): boolean {
    return this.errors.length >= Math.max(+this.config.stopOnErrorCount, 1);
  }

  /**
   * Handle consecutive text nodes as one
   * @argument node parent element
   */
  protected mergeTextChildren(node: DOMNode): void {
    const children = node.children || [];
    for (let i = children.length - 1; i > 0; i--) {
      const child = children[i];
      const previous = children[i - 1];
      if (child.type === 'text' && previous.type === 'text') {
        previous.data += child.data;
        if (previous.sourceSpan && child.sourceSpan) {
          previous.sourceSpan.end = child.sourceSpan.end;
        }
        children.splice(i, 1);
      }
    }
  }

  /**
   * Process input
   */
  protected abstract parse(): void;

  /**
   * Obtain ParseSourceSpan from start line/col and end line/col
   * @argument startLine line # where the span starts
   * @argument startCol col # where the span starts
   * @argument endLine line # where the span ends
   * @argument endCol col # where the span ends
   */
  protected parseSpan(startLine: number, startCol: number, endLine = startLine, endCol = startCol): ParseSourceSpan {
    const start = new ParseLocation(this.source, null, startLine, startCol);
    const end = new ParseLocation(this.source, null, endLine, endCol);
    return new ParseSourceSpan(start, end);
  }
}
