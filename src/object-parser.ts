import { ASTModel } from './ast-model';
import { DOMNode } from './dom-node';
import { JSONModel } from './json-model';
import { JsonParseError } from './parse-error';
import { Parser } from './parser';

/**
 * Parses objects to to DOMNode[]
 */
export abstract class ObjectParser<TSource = ASTModel | JSONModel> extends Parser<TSource> {
  protected parse(): void {
    if (!this.srcObj) {
      try {
        this.srcObj = <TSource[]>JSON.parse(this.source.content);
      } catch (err) {
        const span = this.parseSpan(0, 0, this.source.lines.length - 1, this.source.lines[this.source.lines.length - 1].length);
        this.errors.push(new JsonParseError(span, String(err)));
        return;
      }
    }

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
    if (!Array.isArray(this.srcObj)) {
      this.errors.push(new JsonParseError(null, 'Array was expected'));
      return;
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
