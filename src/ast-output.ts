import { ASTModel } from './ast-model';
import { DOMNode } from './dom-node';
import { DOMNodeAttribute } from './dom-node-attribute';
import { Output } from './output';

/**
 * Parses DOMNode[] to ASTModel[]
 */
export class ASTOutput extends Output<ASTModel> {
  public convert(nodes = this.nodes): ASTModel[] {
    return nodes.map((node) => this[node.type](node));
  }

  public cdata(node: DOMNode): ASTModel {
    return {type: 'cdata', children: this.convert(node.children), ...this.ast(node)};
  }

  public comment(node: DOMNode): ASTModel {
    return {type: 'comment', data: node.data, ...this.ast(node)};
  }

  public directive(node: DOMNode): ASTModel {
    return {type: 'directive', data: node.data, ...this.ast(node)};
  }

  public element(node: DOMNode): ASTModel {
    const attributes: {[name: string]: string} = {};
    DOMNodeAttribute.sort(node.attributes, this.config.orderAttributes).forEach((attrib) => attributes[attrib.name] = attrib.value || '');
    const type = node.name === 'script' || node.name === 'style' ? node.name : 'tag';
    return {type, name: node.name, attribs: attributes, children: this.convert(node.children), ...this.ast(node)};
  }

  public text(node: DOMNode): ASTModel {
    return {type: 'text', data: (node.data || ''), ...this.ast(node)};
  }

  /**
   * Common AST-related info, e.g. source span
   * @argument node source node
   */
  private ast(node: DOMNode): {startIndex?: number; endIndex?: number} {
    return node.sourceSpan ? {startIndex: node.sourceSpan.start.offset, endIndex: node.sourceSpan.end.offset - 1} : {};
  }
}
