import { ASTModel } from './ast-model';
import { DOMNode } from './dom-node';
import { DOMNodeAttribute } from './dom-node-attribute';
import { ObjectParser } from './object-parser';
import { JsonParseError } from './parse-error';

/**
 * Parses ASTModel[] to DOMNode[]
 */
export class ASTParser extends ObjectParser<ASTModel> {
  protected parseItem(item: ASTModel, parent: DOMNode): void {
    switch (item.type) {
      case 'tag':
      case 'script':
      case 'style': {
        const node = new DOMNode('element', parent);
        node.name = item.name;
        const attribs = item.attribs && typeof item.attribs === 'object' && !Array.isArray(item.attribs) ? item.attribs : {};
        for (const [attrib, value] of Object.entries<string>(attribs)) {
          if (value && typeof value === 'object') {
            this.errors.push(new JsonParseError(null, 'Attributes must have string (or empty) values. Key: ' + attrib));
          } else {
            node.attributes.push(new DOMNodeAttribute(attrib, value));
          }
        }
        this.parseChildren(item.children || [], node);
        break;
      }

      case 'cdata': {
        this.parseChildren(item.children || [], new DOMNode('cdata', parent));
        break;
      }

      case 'comment':
      case 'directive':
      case 'text': {
        new DOMNode(item.type, parent, null, item.data);
        break;
      }

      default: {
        this.errors.push(new JsonParseError(null, 'Unknown type: ' + (item.type || 'unspecified')));
      }
    }
  }
}
