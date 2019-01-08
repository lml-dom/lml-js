import { DOMNode } from './dom-node';
import { OutputConfig } from './output-config.d';

/**
 * Output base class
 */
export abstract class Output<TOutput> {
  /**
   * Output modifier options
   */
  public readonly config: OutputConfig = {indentation: '  ', lineWrap: 120};

  /**
   * Init object, set basic properties. Use `.convert()` right after
   * @argument nodes array of nodes to convert
   * @argument config output modifier option overrides
   */
  constructor(public readonly nodes: DOMNode[], config?: OutputConfig) {
    this.config = {...this.config, ...(config || {})};
  }

  /**
   * Recursively converts nodes
   * @argument node array of nodes to convert
   */
  public abstract convert(node: DOMNode[]): string | TOutput[];

  /**
   * CDATA output
   * @argument node Node to output
   */
  public abstract cdata(node: DOMNode): TOutput;

  /**
   * Comment output
   * @argument node Node to output
   */
  public abstract comment(node: DOMNode): TOutput;

  /**
   * Directive output
   * @argument node Node to output
   */
  public abstract directive(node: DOMNode): TOutput;

  /**
   * Element (tag) output
   * @argument node Node to output
   */
  public abstract element(node: DOMNode): TOutput;

  /**
   * Text output
   * @argument node Node to output
   */
  public abstract text(node: DOMNode): TOutput;

  /**
   * Filter to get text child, or return empty string
   * @argument node parent node
   * @return text node (eiter child or fake)
   */
  public textChild(node: DOMNode): DOMNode {
    const text = node.children.find((child) => child.type === 'text') || new DOMNode('text');
    if (text.parent !== node) { // set parent for fake text node without triggering actual addition to parent's children property
      text['_parent'] = node;
    }
    return text;
  }
}
