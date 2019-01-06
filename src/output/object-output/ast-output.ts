import { ASTModel } from '../../ast-model';
import { DOMNode } from '../../dom-node';
import { DOMNodeAttribute } from '../../dom-node-attribute';
import { ObjectOutput } from '../object-output';

/**
 * Parses DOMNode[] to ASTModel[]
 */
export class ASTOutput extends ObjectOutput<ASTModel> {
  public convert(nodes = this.nodes): ASTModel[] {
    return nodes.map((node) => this[node.type](node));
  }

  public cdata(node: DOMNode): ASTModel {
    return this.sanitize({children: this.convert(node.children), ...this.ast(node)});
  }

  public comment(node: DOMNode): ASTModel {
    return {data: node.data, ...this.ast(node)};
  }

  public directive(node: DOMNode): ASTModel {
    return {data: node.data, ...this.ast(node)};
  }

  public element(node: DOMNode): ASTModel {
    const attributes: {[name: string]: string} = {};
    DOMNodeAttribute.sort(node.attributes, this.config.orderAttributes).forEach((attrib) => attributes[attrib.name] = attrib.value || '');
    return this.sanitize({name: node.name, attribs: attributes, children: this.convert(node.children), ...this.ast(node)});
  }

  public text(node: DOMNode): ASTModel {
    return {data: node.data, ...this.ast(node)};
  }

  /**
   * Common AST-related info, e.g. source span
   * @argument node source node
   */
  private ast(node: DOMNode): ASTModel {
    const type = node.type === 'element' ? (node.name === 'script' || node.name === 'style' ? node.name : 'tag') : node.type;
    return node.sourceSpan ? {type, startIndex: node.sourceSpan.start.offset, endIndex: node.sourceSpan.end.offset - 1} : {type};
  }
}
