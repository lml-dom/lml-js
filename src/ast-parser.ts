import { AstComment, AstDirective, AstNode, AstTag, AstText } from './ast-parser.d';
import { Attribute } from './ast/attribute';
import { CData } from './ast/cdata';
import { Comment } from './ast/comment';
import { Directive } from './ast/directive';
import { Element } from './ast/element';
import { Text } from './ast/text';
import { defaultParseConfig } from './config';
import { orderAttributes } from './order-attributes';
import { JsonParseError } from './parse-error';
import { Parser } from './parser';

/**
 * Parses AST JSON input
 */
export class AstParser extends Parser {
  /**
   * Parsed JSON source
   */
  private readonly _src: AstNode[];

  /**
   * Instantiation triggers parsing
   * @argument url Source file path
   * @argument src LML source string
   * @argument config Optional input parsing configuration
   */
  constructor(url: string, src: string | Object, config = defaultParseConfig()) {
    super();
    if (typeof src === 'object') {
      this._src = <AstNode[]>src;
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
  private attributes(attribs: {[key: string]: string}): Attribute[] {
    const attributes: Attribute[] = [];
    for (const [key, value] of Object.entries<string>(attribs && typeof attribs === 'object' && !Array.isArray(attribs) ? attribs : {})) {
      if (value && typeof value === 'object') {
        this.errors.push(new JsonParseError(null, 'Attributes must have string (or empty) values. Key: ' + key));
      } else {
        attributes.push(new Attribute(key, value));
      }
    }
    return attributes;
  }

  /**
   * Process input
   */
  private parse(nodes: AstNode[], parent: Element): void {
    if (!Array.isArray(nodes)) {
      this.errors.push(new JsonParseError(null, 'Array was expected'));
      return;
    }

    for (const node of nodes) {
      switch (node.type) {
        case 'tag':
        case 'script':
        case 'style': {
          const element = new Element((<AstTag>node).name, this.attributes((<AstTag>node).attribs), []);
          orderAttributes(element.attrs, this.config);
          parent.children.push(element);
          this.parse((<AstTag>node).children || [], element);
          break;
        }

        case 'cdata': {
          const element = new CData();
          parent.children.push(element);
          this.parse((<AstTag>node).children || [], element);
          break;
        }

        case 'comment': {
          parent.children.push(new Comment((<AstComment>node).data || ''));
          break;
        }

        case 'directive': {
          parent.children.push(new Directive((<AstDirective>node).data || ''));
          break;
        }

        case 'text': {
          parent.children.push(new Text((<AstText>node).data || ''));
          break;
        }

        default: {
          this.errors.push(new JsonParseError(null, 'Unknown type: ' + (node.type || 'unspecified')));
        }
      }
    }
  }
}
