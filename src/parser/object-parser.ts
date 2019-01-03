import { ASTModel } from '../ast-model';
import { DOMNode } from '../dom-node';
import { JSONModel } from '../json-model';
import { Parser } from '../parser';
import { ParseConfig } from '../parser-config.d';

import { JsonParseError } from './parse-error';
import { ParseSourceFile } from './parse-source-file';

/**
 * Parses objects to to DOMNode[]
 */
export abstract class ObjectParser<TSource = ASTModel | JSONModel> extends Parser {
  /**
   * JSON/AST source
   */
  protected srcObj: TSource[];

  /**
   * Instantiation triggers parsing
   * @argument src Parsable source string or JSON-style object
   * @argument config Optional input parsing configuration overrides
   */
  constructor(src: TSource[] | string, config?: ParseConfig) {
    super();
    this.config = {...this.config, ...(config || {})};
    if (typeof src === 'string') {
      this.source = new ParseSourceFile(src, this.config.url);
      try {
        this.srcObj = <TSource[]>JSON.parse(this.source.content);
      } catch (err) {
        throw new JsonParseError(String(err));
      }
    } else {
      let str: string;
      this.srcObj = <TSource[]>src;
      try {
        str = JSON.stringify(src);
      } catch (err) {
        throw new JsonParseError(String(err));
      }
      this.source = new ParseSourceFile(str, this.config.url);
    }

    if (!Array.isArray(this.srcObj)) {
      throw new JsonParseError('Array was expected');
    } else {
      this.parse();
    }
  }

  protected parse(): void {
    const fakeRoot = new DOMNode('element');
    this.parseChildren(this.srcObj, fakeRoot);
    this.rootNodes.push(...fakeRoot.children);
    this.rootNodes.forEach((node) => node.parent = null);
  }

  /**
   * Recursively process input arrays
   * @argument items Array of JSON objects
   * @argument parent container object (or null) that is already processed into a DOMNode
   */
  protected parseChildren(items: TSource[], parent: DOMNode): void {
    if (items && !Array.isArray(items)) {
      throw new JsonParseError('Property `children` must always be an array');
    }

    for (const item of items) {
      this.parseItem(item, parent);
    }
  }

  /**
   * Process input item
   * @argument item JSON object
   * @argument parent container object (or null) that is already processed into a DOMNode
   */
  protected abstract parseItem(item: TSource, parent: DOMNode): void;
}
