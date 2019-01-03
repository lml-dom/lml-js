import { AttributeOrderMode } from './dom-node-attribute';

export interface OutputConfig {
  /**
   * For string output: a tab (\t) or 1+ space characters (defaults to 2 spaces)
   */
  indentation?: string;

  /**
   * For HTML and LML output, attempt to limit line length at this value.
   * Exceptions:
   *   - script, style, and textarea values (for value safety)
   *   - very long words exceeding the limit
   *   - too deep indentation that results in too little space available
   * Defaults to 120
   */
  lineWrap?: number;

  /**
   * Make HTML or JSON-string output footprint the smallest
   */
  minify?: boolean;

  /**
   * Sort attributes
   */
  orderAttributes?: AttributeOrderMode;
}
