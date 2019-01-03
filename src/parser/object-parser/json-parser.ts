import { DOMNode } from '../../dom-node';
import { DOMNodeAttribute } from '../../dom-node-attribute';
import { JSONModel } from '../../json-model';
import { ObjectParser } from '../object-parser';
import { JsonParseError } from '../parse-error';

/**
 * Parses JSONModel[] to DOMNode[]
 */
export class JSONParser extends ObjectParser<JSONModel> {
  protected parseItem(item: JSONModel, parent: DOMNode): void {
    switch (item.type) {
      case 'element': {
        const node = new DOMNode('element', parent);
        node.name = item.name;
        node.attributes.push(...item.attributes.map((attrib) => new DOMNodeAttribute(attrib.name, attrib.value)));
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
        throw new JsonParseError('Unknown type: ' + (item.type || 'unspecified'));
      }
    }
  }
}
