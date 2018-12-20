import { Attribute } from './ast/attribute';
import { OutputConfig } from './config';

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
 * Order attributes based on configuration
 */
export function orderAttributes(attrs: Attribute[], config: OutputConfig): Attribute[] {
  if (config.orderAttributes === 'angular') {
    attrs.sort((a, b) => {
      return angularComparable(a.name) > angularComparable(b.name) ? 1 : -1;
    });
  } else if (config.orderAttributes === 'natural') {
    attrs.sort((a, b) => {
      return a.name.toLowerCase().replace(NATURAL_ATTRIBUTE_RX, '') > b.name.toLowerCase().replace(NATURAL_ATTRIBUTE_RX, '') ? 1 : -1;
    });
  } else if (config.orderAttributes) {
    attrs.sort((a, b) => {
      return a.name > b.name ? 1 : -1;
    });
  }
  return attrs;
}
