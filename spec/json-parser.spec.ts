// tslint:disable:completed-docs max-file-line-count no-magic-numbers object-literal-sort-keys

import { parseJSON } from '../index';
import { DOMNode } from '../src/dom-node';
import { JSONModel } from '../src/json-model';
import { Parser } from '../src/parser';
import { AttributesMustBeAnArrayWarning, InvalidAttributeNameWarning, InvalidAttributeValueWarning,
  InvalidTypeWarning } from '../src/parser/parse-warning';

const exampleJSON: JSONModel[] = [
  {
    type: 'directive',
    data: 'DOCTYPE html'
  },
  {
    type: 'element',
    name: 'html',
    children: [
      {
        type: 'element',
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
          }
        ]
      },
      {
        type: 'element',
        name: 'body',
        attributes: [
          {
            name: 'class',
            value: 'abc'
          }
        ],
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

describe('JSONParser', () => {
  it('parses object', () => {
    const parser = <Parser>parseJSON(exampleJSON);
    function cmpList(srcItems: JSONModel[], nodes: DOMNode[], keys: string[] = []): void {
      srcItems.forEach((srcItem, i) => {
        const node = nodes[i];
        for (const [key, value] of Object.entries(srcItem)) {
          if (key === 'attributes') {
            for (const attribute of srcItem.attributes) {
              const nodeAttrVal = node.attributes.find((nodeAttribute) => nodeAttribute.name === attribute.name).value;
              expect(nodeAttrVal).toBe(attribute.value, `${[].concat(keys, [i, key, 'attributes', attribute.name]).join('.')}:` +
                `${JSON.stringify(attribute.value)}!=${JSON.stringify(nodeAttrVal)}`);
            }
          } else if (key === 'children') {
            cmpList(srcItem.children, node.children, [].concat(keys, [i, key]));
          } else {
            expect(node[key]).toBe(value, `${[].concat(keys, [i, key]).join('.')}:${JSON.stringify(value)}!=${JSON.stringify(node[key])}`);
          }
        }
      });
    }
    cmpList(exampleJSON, parser.rootNodes);
  });

  it('parses from string', () => {
    const parser = <Parser>parseJSON(JSON.stringify(exampleJSON));
    expect(parser.rootNodes[1].children[1].children[1].data).toBe('hello');
  });

  it('ignores element with unknown type', () => {
    const modified = JSON.parse(JSON.stringify(exampleJSON));
    modified[1].children[1].type = 'xx';
    const parser = <Parser>parseJSON(modified);
    expect(parser.rootNodes[1].children[1]).toBeUndefined();
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof InvalidTypeWarning).toBe(true);
  });

  it('ignores element on missing type', () => {
    const modified = JSON.parse(JSON.stringify(exampleJSON));
    delete modified[1].children[1].type;
    const parser = <Parser>parseJSON(modified);
    expect(parser.rootNodes[1].children[1]).toBeUndefined();
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof InvalidTypeWarning).toBe(true);
  });

  it('ignores attributes property if it is not an array', () => {
    const modified = JSON.parse(JSON.stringify(exampleJSON));
    modified[1].attributes = {};
    const parser = <Parser>parseJSON(modified);
    expect(parser.rootNodes[1].attributes.length).toBe(0);
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof AttributesMustBeAnArrayWarning).toBe(true);
  });

  it('ignores attribute if name is not a string', () => {
    const modified = JSON.parse(JSON.stringify(exampleJSON));
    modified[1].attributes = [{name: true}];
    const parser = <Parser>parseJSON(modified);
    expect(parser.rootNodes[1].attributes.length).toBe(0);
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof InvalidAttributeNameWarning).toBe(true);
  });

  it('ignores attribute if name is an empty string', () => {
    const modified = JSON.parse(JSON.stringify(exampleJSON));
    modified[1].attributes = [{name: ''}];
    const parser = <Parser>parseJSON(modified);
    expect(parser.rootNodes[1].attributes.length).toBe(0);
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof InvalidAttributeNameWarning).toBe(true);
  });

  it('ignores attribute if value is not typeof string or == null', () => {
    const modified = JSON.parse(JSON.stringify(exampleJSON));
    modified[1].attributes = [{name: 'a', value: false}, {name: 'b', value: {}}, {name: 'c', value: ''}, {name: 'd', value: 'x'}];
    const parser = <Parser>parseJSON(modified);
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
