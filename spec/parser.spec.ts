// tslint:disable:no-magic-numbers

import { parseJSON, parseLML } from '../index';
import { JSONModel } from '../src/json-model';
import { Parser } from '../src/parser';
import { InvalidParentWarning, InvalidTagNameWarning } from '../src/parser/parse-warning';

describe('Parser', () => {
  it('catches void parent problem', () => {
    const parser = parseLML(`div\n\tinput\n\t\t; hello\ndiv`);
    const json = parser.toJSON();
    expect(parser.errors[0] instanceof InvalidParentWarning).toBe(true);
    expect(parser.errors.length).toBe(1);
    expect(json[0].children[0].children[0].data).toBe('hello');
  });

  it('does not have a text child if empty (cdata)', () => {
    const json = parseLML(`div\n$\ndiv`).toJSON();
    expect(json[1].type).toBe('cdata');
    expect(json[1].children).toBeUndefined();
  });

  it('does not have a text child if empty (script)', () => {
    const json = parseLML(`div\nstyle\n\t  \ndiv`).toJSON();
    expect(json[1].name).toBe('style');
    expect(json[1].children).toBeUndefined();
  });

  it('invalid tag name', () => {
    const parser = parseLML(`div\n\t*ds\n\t\t; hello\ndiv`);
    const json = parser.toJSON();
    expect(parser.errors[0] instanceof InvalidTagNameWarning).toBe(true);
    expect(parser.errors.length).toBe(1);
    expect(json[0].children[0].type).toBe('element');
    expect(json[0].children[0].name).toBe('*ds');
  });

  it('neigboring text nodes get concatenated by an enter (with source span)', () => {
    const parser = <Parser>parseLML(`div ; x\n\t; y\n\t; z`);
    const json = parser.toJSON();
    expect(json[0].children.length).toBe(1);
    expect(json[0].children[0].data).toBe('x\ny\nz');
    expect(parser.rootNodes[0].children[0].sourceSpan.start.offset).toBe(4);
    expect(parser.rootNodes[0].children[0].sourceSpan.end.offset).toBe(17);
  });

  it('neigboring text nodes get concatenated by an enter (without source span), empty text nodes are ignored', () => {
    const texts: JSONModel[] = [{type: 'text', data: 'x'}, {type: 'text', data: 'y'}, {type: 'text', data: ' '}, {type: 'text', data: 'z'},
      {type: 'text', data: ''}];
    const json = parseJSON([{type: 'element', name: 'div', children: texts}]).toJSON();
    expect(json[0].children.length).toBe(1);
    expect(json[0].children[0].data).toBe('x\ny\nz');
    expect(json[0].children[0].data).toBe('x\ny\nz');
  });

  it('empty connecting text nodes are removed', () => {
    const subnodes: JSONModel[] = [{type: 'element', name: 'span'}, {type: 'text', data: '\n'}, {type: 'element', name: 'span'}];
    const json = parseJSON([{type: 'element', name: 'div', children: subnodes}]).toJSON();
    expect(json[0].children.length).toBe(2);
    expect(json[0].children[0].name).toBe('span');
    expect(json[0].children[1].name).toBe('span');
  });

  it('provides LML output', () => {
    const lml = parseJSON([{type: 'element', name: 'div'}]).toLML();
    expect(lml).toBe('div\n');
  });

  it('provides LML output on toString', () => {
    const lml = parseJSON([{type: 'element', name: 'div'}]).toString();
    expect(lml).toBe('div\n');
  });

  it('provides HTML output', () => {
    const html = parseJSON([{type: 'element', name: 'div'}]).toHTML();
    expect(html).toBe('<div></div>\n');
  });

  it('provides JSON output', () => {
    const json = parseLML('div').toJSON();
    expect(json).toEqual([{type: 'element', name: 'div'}]);
  });

  it('provides AST output', () => {
    const ast = parseLML('div').toAST();
    expect(ast).toEqual([{type: 'tag', name: 'div', startIndex: 0, endIndex: 2}]);
  });
});
