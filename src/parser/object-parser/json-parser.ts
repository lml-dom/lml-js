import { DOMNode } from '../../dom-node';
import { DOMNodeAttribute } from '../../dom-node-attribute';
import { JSONModel } from '../../json-model';
import { ObjectParser } from '../object-parser';
import { JsonParseError } from '../parse-error';
import { AttributesMustBeAnArrayWarning, InvalidAttributeNameWarning, InvalidAttributeValueWarning,
  InvalidTypeWarning } from '../parse-warning';

/**
 * Parses JSONModel[] to DOMNode[]
 */
export class JSONParser extends ObjectParser<JSONModel> {
  protected parseItem(item: JSONModel, parent: DOMNode): void {
    switch (item.type) {
      case 'element': {
        const node = new DOMNode('element', parent);
        node.name = item.name;

        // attributes
        if (typeof item.attributes !== 'undefined') {
          if (Array.isArray(item.attributes)) {
            node.attributes.push(...item.attributes.filter((attrib) => {
              if (!attrib.name || typeof attrib.name !== 'string') {
                this.errors.push(new InvalidAttributeNameWarning());
                return false;
              }
              if (attrib.value != null && typeof attrib.value !== 'string') {
                this.errors.push(new InvalidAttributeValueWarning());
                return false;
              }
              return true;
            }).map((attrib) => new DOMNodeAttribute(attrib.name, attrib.value)));
          } else {
            this.errors.push(new AttributesMustBeAnArrayWarning());
          }
        }

        this.parseChildren(item.children, node);
        break;
      }

      case 'cdata': {
        this.parseChildren(item.children, new DOMNode('cdata', parent));
        break;
      }

      case 'comment':
      case 'directive':
      case 'text': {
        new DOMNode(item.type, parent, null, item.data);
        break;
      }

      default: {
        this.errors.push(new InvalidTypeWarning(item.type));
      }
    }
  }
}
