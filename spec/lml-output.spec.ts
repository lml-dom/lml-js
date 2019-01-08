// tslint:disable:max-line-length no-magic-numbers object-literal-sort-keys

import { parseJSON } from '../index';
import { JSONModel } from '../src/json-model';
import { Parser } from '../src/parser';

export const exampleJSON: JSONModel[] = [
  {
    type: 'directive',
    data: '!DOCTYPE html'
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
          },
          {
            type: 'element',
            name: 'textarea',
            attributes: [
              {
                name: 'id',
                value: 'first'
              }
            ],
            children: [
              {
                type: 'text',
                data: 'hello'
              }
            ]
          },
          {
            type: 'element',
            name: 'script',
            children: [
              {
                type: 'text',
                data: 'alert(1);'
              }
            ]
          },
          {
            type: 'element',
            name: 'style'
          },
          {
            type: 'element',
            name: 'style',
            children: [
              {
                type: 'text',
                data: '/* just making this line way too long to be inline - will be pushed to next line, even though there is no line break */ .hello { color: red; }'
              }
            ]
          },
          {
            type: 'element',
            name: 'div',
            children: [
              {
                type: 'text',
                data: 'one-liner'
              }
            ]
          },
          {
            type: 'element',
            name: 'div',
            children: [
              {
                type: 'text',
                data: 'one line in origin, but too long to be inline - will be pushed to next line, plus be wrapped, well, hopefully :|'
              }
            ]
          }
        ]
      }
    ]
  }
];

const exampleLML = `!DOCTYPE html
html
  head
    $character data
  body class="abc"
    # example
    ; hello
    textarea id="first"
      hello
    script ; alert(1);
    style
    style
      /* just making this line way too long to be inline - will be pushed to next line, even though there is no line break */ .hello { color: red; }
    div ; one-liner
    div
      ; one line in origin, but too long to be inline - will be pushed to next line, plus be wrapped, well, hopefully :|
`;

describe('LML output', () => {
  it('translates properly', () => {
    const parser = <Parser>parseJSON(exampleJSON);
    const lml = parser.toLML();
    expect(lml).toBe(exampleLML);
  });
});
