import { Node } from './ast/node';
import { defaultConfig } from './config';
import { ParseError } from './parse-error';

/**
 * AST container
 * Resembles the @angular/compiler `ParseTreeResult` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/ml_parser/parser.ts}
 */
export class ParseTreeResult {
  constructor(public rootNodes: Node[], public errors: ParseError[]) {}

  public toHtml(config = defaultConfig): string {
    let out = '';
    for (const child of this.rootNodes || []) {
      out += child.toHtml(config);
    }
    return out;
  }

  public toJSON(config = defaultConfig): Object {
    return this.rootNodes.map((node) => node.toJSON(config)).filter((child) => !!child);
  }

  public toLml(config = defaultConfig): string {
    let out = '';
    for (const child of this.rootNodes || []) {
      out += child.toLml(config);
    }
    return out;
  }
}
