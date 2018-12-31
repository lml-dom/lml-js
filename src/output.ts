import { DOMNode } from './dom-node';
import { AttributeOrderMode } from './dom-node-attribute';

export interface OutputConfig {
  indentation?: string;
  lineWrap?: number;
  minify?: boolean;
  orderAttributes?: AttributeOrderMode;
}

const LINE_WRAP_MIN = 40;

/**
 * Output base class
 */
export abstract class Output<TOutput> {
  /**
   * Default configuration for output
   */
  public static defaultConfig: OutputConfig = {indentation: '  ', lineWrap: 120};

  /**
   * Output modifier options
   */
  public readonly config: OutputConfig = {...Output.defaultConfig};

  /**
   * Init object, set basic properties. Use `.convert()` right after
   * @argument nodes array of nodes to convert
   * @argument config output modifier option overrides
   */
  constructor(public readonly nodes: DOMNode[], config?: OutputConfig) {
    this.config = {...this.config, ...(config || {})};
    this.config.lineWrap = Math.max(LINE_WRAP_MIN, +this.config.lineWrap);
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
   * Filter to text type children only. Useful for text block items like CDATA, textarea, script, and style
   * @argument node parent node
   */
  public textChildren(node: DOMNode): DOMNode[] {
    return node.children.filter((child) => child.type === 'text');
  }
}
