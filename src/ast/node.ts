import { Config } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

import { Element } from './element';

const BACKTICK_RX = /`/g;
const FIRST_SPACE_RX = /\s/;
const LAST_SPACE_RX = /\s\S*$/;
const EVEN = 2;

/**
 * HTML node base class
 * Resembles the @angular/compiler `Node` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/ml_parser/ast.ts}
 */
export abstract class Node {
  /**
   * Parent element reference. Set/get by `.parent`
   */
  private _parent: Element;

  /**
   * @argument sourceSpan Source full string span for the whole tag
   */
  constructor(public sourceSpan: ParseSourceSpan) {}

  /**
   * Indicates that based on the context (e.g. this is text, and parent is not something like textarea or cdata),
   * text value is not sensitive to line wrapping
   */
  protected get lineWrap(): boolean {
    return false;
  }

  /**
   * JSON base. Used by extending classes toJSON() methods
   */
  protected json(info: Object): Object {
    return {...info, startIndex: this.sourceSpan.start.offset, endIndex: this.sourceSpan.end.offset - 1};
  }

  /**
   * Parent node reference
   */
  public get parent(): Element {
    return this._parent;
  }

  /**
   * Update will unlink it from current parent (if set), and add it to the `.children` array of the specified element
   */
  public set parent(element: Element) {
    element = element && element.children ? element : undefined;
    if (this._parent !== element) {
      if (this._parent) {
        const pos = this._parent.children.indexOf(this);
        if (pos > -1) {
          this._parent.children.splice(pos, 1);
        }
      }
      this._parent = element;
      if (element) {
        element.children.push(this);
      }
    }
  }

  /**
   * Export node to HTML, including possible children
   * @argument config Optional output syntax configuration
   * @argument tabulation Starting indentation. Empty string (default) for top level or >0 repetations of config.indentation
   * @argument textOnly whether to accept only text nodes as children. Meant for internal use only
   */
  public abstract toHtml(config?: Config, tabulation?: string): string;

  /**
   * Export node to JSON, including possible children. Meant to create an AST map.
   * @argument config Optional output syntax configuration
   */
  public abstract toJSON(config?: Config): Object;

  /**
   * Export node to LML, including possible children
   * @argument config Optional output syntax configuration
   * @argument tabulation Starting indentation. Empty string (default) for top level or >0 repetations of config.indentation
   * @argument textOnly whether to accept only text nodes as children. Meant for internal use only
   */
  public abstract toLml(config?: Config, tabulation?: string): string;

  /**
   * @see {@link toLml} Same as `toLml()`
   */
  public toString(config?: Config, tabulation?: string): string {
    return this.toLml(config, tabulation);
  }

  /**
   * Will prefix indentation for an LML multiline text (script/style/cdata/comment/textarea data) block
   */
  protected multilineIndentation(value: string, config: Config, tabulation: string, startOnNextLine = false, backticks = false): string {
    let backtickCount = 0;
    const indentation = tabulation + config.indentation;
    const indentLen = indentation.length;
    return value.split('\n').map((line, i) => {
      line = ((startOnNextLine || i) && (!backticks || backtickCount % EVEN === 0)) ? indentation + line : line;

      if (backticks) {
        backtickCount += (line.match(BACKTICK_RX) || []).length;
      } else if (this.lineWrap) {
        const lines: string[] = [line];
        let l: string;
        let m: RegExpMatchArray;
        while ((l = lines[lines.length - 1]).length > config.lineWrap && l.length > indentLen &&
          ((m = l.substr(indentLen, config.lineWrap - indentLen).match(LAST_SPACE_RX)) || (m = l.substr(indentLen).match(FIRST_SPACE_RX)))
        ) {
          lines[lines.length - 1] = (lines.length > 1 ? indentation : '') + l.substr(0, indentLen + m.index).trim();
          lines.push(indentation + l.substr(indentLen + m.index + 1).trim());
        }
        line = lines.join('\n');
      }
      return line;
    }).join('\n');
  }
}
