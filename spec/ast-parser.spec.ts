// tslint:disable:completed-docs max-file-line-count no-magic-numbers object-literal-sort-keys

import { parseAST } from '../index';
import { ASTModel } from '../src/ast-model';
import { DOMNode } from '../src/dom-node';
import { Parser } from '../src/parser';
import { AttribsMustBeKeyValueDictionaryWarning, InvalidAttributeNameWarning, InvalidAttributeValueWarning,
  InvalidTypeWarning } from '../src/parser/parse-warning';

export const exampleAST: ASTModel[] = [
  {
    type: 'directive',
    data: 'DOCTYPE html'
  },
  {
    type: 'tag',
    name: 'html',
    children: [
      {
        type: 'tag',
        name: 'head',
        children: [
          {
            type: 'cdata',
            children: [
              {
                type: 'text',
                data: 'character data'
              }
            ]
          },
          {
            type: 'script',
            name: 'script',
            children: [
              {
                type: 'text',
                data: 'alert(1);'
              }
            ]
          }
        ]
      },
      {
        type: 'tag',
        name: 'body',
        attribs: {
          class: 'abc'
        },
        children: [
          {
            type: 'comment',
            data: 'example'
          },
          {
            type: 'text',
            data: 'hello'
          }
        ]
      }
    ]
  }
];

describe('ASTParser', () => {
  it('parses object', () => {
    const parser = <Parser>parseAST(exampleAST);
    function cmpList(srcItems: ASTModel[], nodes: DOMNode[], keys: string[] = []): void {
      srcItems.forEach((srcItem, i) => {
        const node = nodes[i];
        for (const [key, value] of Object.entries(srcItem)) {
          if (key === 'attribs') {
            for (const [attributeName, attributeValue] of Object.entries(srcItem.attribs)) {
              const nodeAttrVal = node.attributes.find((nodeAttribute) => nodeAttribute.name === attributeName).value;
              expect(nodeAttrVal).toBe(attributeValue, `${[].concat(keys, [i, key, 'attributes', attributeName]).join('.')}:` +
                `${JSON.stringify(attributeValue)}!=${JSON.stringify(nodeAttrVal)}`);
            }
          } else if (key === 'children') {
            cmpList(srcItem.children, node.children, [].concat(keys, [i, key]));
          } else if (key === 'type' && (value === 'script' || value === 'style' || value === 'tag')) {
            expect(node.type).toBe('element');
            if (value === 'script' || value === 'style') {
              expect(node.name).toBe(value);
            }
          } else {
            expect(node[key]).toBe(value, `${[].concat(keys, [i, key]).join('.')}:${JSON.stringify(value)}!=${JSON.stringify(node[key])}`);
          }
        }
      });
    }
    cmpList(exampleAST, parser.rootNodes);
  });

  it('parses from string', () => {
    const parser = <Parser>parseAST(JSON.stringify(exampleAST));
    expect(parser.rootNodes[1].children[1].children[1].data).toBe('hello');
  });

  it('ignores element with unknown type', () => {
    const modified = JSON.parse(JSON.stringify(exampleAST));
    modified[1].children[1].type = 'xx';
    const parser = <Parser>parseAST(modified);
    expect(parser.rootNodes[1].children[1]).toBeUndefined();
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof InvalidTypeWarning).toBe(true);
  });

  it('ignores element on missing type', () => {
    const modified = JSON.parse(JSON.stringify(exampleAST));
    delete modified[1].children[1].type;
    const parser = <Parser>parseAST(modified);
    expect(parser.rootNodes[1].children[1]).toBeUndefined();
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof InvalidTypeWarning).toBe(true);
  });

  it('ignores attribs property if it is not a proper object', () => {
    const modified = JSON.parse(JSON.stringify(exampleAST));
    modified[1].attribs = [];
    const parser = <Parser>parseAST(modified);
    expect(parser.rootNodes[1].attributes.length).toBe(0);
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof AttribsMustBeKeyValueDictionaryWarning).toBe(true);
  });

  it('ignores attribute if name is an empty string', () => {
    const modified = JSON.parse(JSON.stringify(exampleAST));
    modified[1].attribs = {'': 'x'};
    const parser = <Parser>parseAST(modified);
    expect(parser.rootNodes[1].attributes.length).toBe(0);
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof InvalidAttributeNameWarning).toBe(true);
  });

  it('ignores attribute if value is not typeof string or == null', () => {
    const modified = JSON.parse(JSON.stringify(exampleAST));
    modified[1].attribs = {a: false, b: {}, c: '', d: 'x'};
    const parser = <Parser>parseAST(modified);
    expect(parser.rootNodes[1].attributes.length).toBe(2);
    expect(parser.rootNodes[1].attributes[0].name).toBe('c');
    expect(parser.rootNodes[1].attributes[0].value).toBe(null);
    expect(parser.rootNodes[1].attributes[1].name).toBe('d');
    expect(parser.rootNodes[1].attributes[1].value).toBe('x');
    expect(parser.errors.length).toBe(2);
    expect(parser.errors[0] instanceof InvalidAttributeValueWarning).toBe(true);
    expect(parser.errors[1] instanceof InvalidAttributeValueWarning).toBe(true);
  });
});
