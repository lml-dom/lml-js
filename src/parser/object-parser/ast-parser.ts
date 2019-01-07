import { ASTModel } from '../../ast-model';
import { DOMNode } from '../../dom-node';
import { DOMNodeAttribute } from '../../dom-node-attribute';
import { ObjectParser } from '../object-parser';
import { AttribsMustBeKeyValueDictionaryWarning, InvalidAttributeNameWarning, InvalidAttributeValueWarning,
  InvalidTypeWarning } from '../parse-warning';

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

        // attributes
        if (typeof item.attribs !== 'undefined') {
          if (item.attribs && typeof item.attribs === 'object' && !Array.isArray(item.attribs)) {
            for (const [attrib, value] of Object.entries<string>(item.attribs)) {
              if (!attrib) {
                this.errors.push(new InvalidAttributeNameWarning());
              } else if (value != null && typeof value !== 'string') {
                this.errors.push(new InvalidAttributeValueWarning());
              } else {
                node.attributes.push(new DOMNodeAttribute(attrib, value));
              }
            }
          } else {
            this.errors.push(new AttribsMustBeKeyValueDictionaryWarning());
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
