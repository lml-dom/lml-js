import { Attribute } from './ast/attribute';
import { CData } from './ast/cdata';
import { Comment } from './ast/comment';
import { Directive } from './ast/directive';
import { Element } from './ast/element';
import { Text } from './ast/text';
import { defaultParseConfig } from './config';
import { JsonComment, JsonDirective, JsonElement, JsonNode, JsonText } from './json-parser.d';
import { orderAttributes } from './order-attributes';
import { JsonParseError } from './parse-error';
import { Parser } from './parser';

/**
 * Parses JSON input
 */
export class JsonParser extends Parser {
  /**
   * Parsed JSON source
   */
  private readonly _src: JsonNode[];

  /**
   * Instantiation triggers parsing
   * @argument url Source file path
   * @argument src LML source string
   * @argument config Optional input parsing configuration
   */
  constructor(url: string, src: string | Object, config = defaultParseConfig()) {
    super();
    if (typeof src === 'object') {
      this._src = <JsonNode[]>src;
      this.preProcess(url, JSON.stringify(src), config);
      this.parse(this._src, this._levels[-1]);
    } else {
      this.preProcess(url, src, config);
      try {
        this._src = JSON.parse(this.source.content);
      } catch (err) {
        this.errors.push(new JsonParseError(null, String(err)));
        return;
      }
      this.parse(this._src, this._levels[-1]);
    }
  }

  /**
   * Attribute santization
   */
  private attributes(attribs: {name: string; value?: string}[]): Attribute[] {
    const attributes: Attribute[] = [];
    for (const attrib of (Array.isArray(attribs) ? attribs : [])) {
      if (!attrib.name || typeof attrib.name !== 'string') {
        this.errors.push(new JsonParseError(null, 'Attributes must have non-empty string names'));
      } if (attrib.value && typeof attrib.value === 'object') {
        this.errors.push(new JsonParseError(null, 'Attributes must have string (or empty) values'));
      } else if (attrib.value != null) {
        attributes.push(new Attribute(attrib.name, String(attrib.value)));
      } else {
        attributes.push(new Attribute(attrib.name, null));
      }
    }
    return attributes;
  }

  /**
   * Process input
   */
  private parse(nodes: JsonNode[], parent: Element): void {
    if (!Array.isArray(nodes)) {
      this.errors.push(new JsonParseError(null, 'Array was expected'));
      return;
    }

    for (const node of nodes) {
      switch (node.type) {
        case 'element': {
          const element = new Element((<JsonElement>node).name, this.attributes((<JsonElement>node).attributes), []);
          orderAttributes(element.attrs, this.config);
          parent.children.push(element);
          this.parse((<JsonElement>node).children || [], element);
          break;
        }

        case 'cdata': {
          const element = new CData();
          parent.children.push(element);
          this.parse((<JsonElement>node).children || [], element);
          break;
        }

        case 'comment': {
          parent.children.push(new Comment((<JsonComment>node).data || ''));
          break;
        }

        case 'directive': {
          parent.children.push(new Directive((<JsonDirective>node).data || ''));
          break;
        }

        case 'text': {
          parent.children.push(new Text((<JsonText>node).data || ''));
          break;
        }

        default: {
          this.errors.push(new JsonParseError(null, 'Unknown type: ' + (node.type || 'unspecified')));
        }
      }
    }
  }
}
