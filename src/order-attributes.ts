import { Attribute } from './ast/attribute';
import { OutputConfig } from './config';

const NATURAL_ATTRIBUTE_RX = /[^a-z0-9\-]/g;

/**
 * Order attributes based on configuration
 */
export function orderAttributes(attrs: Attribute[], config: OutputConfig): Attribute[] {
  if (config.orderAttributes === 'angular') {
    attrs.sort((a, b) => {
      return a.name.toLowerCase().replace('(', '{') > b.name.toLowerCase().replace('(', '{') ? 1 : -1;
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
