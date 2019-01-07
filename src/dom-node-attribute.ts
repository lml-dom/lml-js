import { ParseLocation } from './parser/parse-location';
import { ParseSourceSpan } from './parser/parse-source-span';

export type AttributeOrderMode = 'angular' | 'ascii' | 'natural';

const NATURAL_ATTRIBUTE_RX = /[^a-z0-9\-]/g;

const BANANA_BOX_OPEN_RX = /^\[\(/;
const BRACKET_OPEN_RX = /^\(/;
const SQUARE_BRACKET_OPEN_RX = /^\[/;

/**
 * Changes the string to comparable base for angular-ordering
 */
function angularComparable(name: string): string {
  return name.toLowerCase().replace(BRACKET_OPEN_RX, '{').replace(BANANA_BOX_OPEN_RX, '{ ').replace(SQUARE_BRACKET_OPEN_RX, '');
}

/**
 * Changes the string to comparable base for angular-ordering
 */
function naturalComparable(name: string): string {
  return name.toLowerCase().replace(NATURAL_ATTRIBUTE_RX, '');
}

/**
 * Attribute of an HTML tag
 */
export class DOMNodeAttribute {
  /**
   * Position of the equal sign
   */
  public eqPos?: ParseLocation;

  /**
   * Quote used in original string
   */
  public quote?: '\'' | '"';

  /**
   * Value of the attribute. Null means attribute-name only
   */
  public value: string;

  /**
   * Order attributes
   * @argument attributes Array of attributes to reorder
   * @argument order sorting logic. Defaults to 'ascii'
   */
  public static sort(attributes: DOMNodeAttribute[], order: AttributeOrderMode): DOMNodeAttribute[] {
    switch (order) {
      case 'angular': {
        return attributes.sort((a, b) => angularComparable(a.name) > angularComparable(b.name) ? 1 : -1);
      }

      case 'natural': {
        return attributes.sort((a, b) => naturalComparable(a.name) > naturalComparable(b.name) ? 1 : -1);
      }

      default: {
        if (order) {
          return attributes.sort((a, b) => a.name > b.name ? 1 : -1);
        }
        return attributes;
      }
    }
  }

  /**
   * @argument name Attribute name (e.g. `class` in `class="x y z"` or something like `hidden` in a no-value attribute)
   * @argument value Attribute value (e.g. `x y z` in `class="x y z"`). Empty string for void attribute (e.g. `<div hidden></div>`)
   * @argument sourceSpan Source full string span (includes name, value, quotes etc)
   * @argument valueSpan Source value string span (includes value, excluding quotes)
   */
  constructor(public name: string, value: string, public sourceSpan?: ParseSourceSpan, public valueSpan?: ParseSourceSpan) {
    this.value = value && typeof value === 'string' ? value : null;
  }

  /**
   * Stringify an attribute to HTML or LML syntax
   */
  public toString(): string {
    let str = this.name;
    if (this.value) {
      const quote = this.value.includes('"') && !this.value.includes('\'') ? '\'' : '"';
      str += `=${quote + this.value + quote}`;
    }
    return str;
  }
}
