import { DOMNodeAttribute } from './dom-node-attribute';
import { ParseSourceSpan } from './parser/parse-source-span';

export type DOMNodeType = 'cdata' | 'comment' | 'directive' | 'element' | 'text';

/**
 * HTML/DOM node represntation
 */
export class DOMNode {
  /**
   * Explicit list of void HTML tags
   */
  public static voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  /**
   * Closing tag coordinates (when from HTML)
   */
  public closeTagSpan?: ParseSourceSpan;

  /**
   * Attributes for elements
   */
  public readonly attributes: DOMNodeAttribute[] = [];

  /**
   * Optional source span reference
   */
  public readonly children: DOMNode[] = [];

  /**
   * Name for element type
   */
  public name: string;

  /**
   * Parent ref store for getter/setter
   */
  private _parent: DOMNode = null;

  /**
   * @argument type node type. Defines behavior and abilities
   * @argument parent optional parent reference
   * @argument sourceSpan optional start/end ref in source
   * @argument data Data of text, comment or directive types. CDATA will get a text child if passed
   */
  constructor(public readonly type: DOMNodeType, parent: DOMNode = null, public sourceSpan?: ParseSourceSpan, public data = '') {
    if (type === 'cdata' && this.data) {
      new DOMNode('text', this, sourceSpan, this.data);
      this.data = '';
    }
    this.parent = parent;
  }

  /**
   * Get parent node reference
   */
  public get parent(): DOMNode {
    return this._parent;
  }

  /**
   * Assign new parent (or unassign by passing void value), remove from old parent's (if any) children array, and add to new parent's
   * (if any) children array
   */
  public set parent(parent: DOMNode) {
    if (this._parent !== parent) {
      if (this._parent) {
        const pos = this._parent.children.indexOf(this);
        if (pos > -1) {
          this._parent.children.splice(pos, 1);
        }
      }
      if (parent) {
        parent.children.push(this);
      }
    }
    this._parent = parent || null;

  }

  /**
   * Retrieve hierarchy level
   */
  public get level(): number {
    return this.parent ? this.parent.level + 1 : 0;
  }
}
