// tslint:disable:completed-docs max-file-line-count no-magic-numbers object-literal-sort-keys

import { parseAST, parseJSON } from '../index';
import { Parser } from '../src/parser';
import { ChildrenMustBeAnArrayWarning} from '../src/parser/parse-warning';

import { exampleAST } from './ast-parser.spec';

describe('ObjectParser', () => {
  it('throws on non-array top level input', () => {
    expect(() => parseJSON(JSON.stringify({}))).toThrow();
  });

  it('throws on non-json string', () => {
    expect(() => parseJSON('nope')).toThrow();
  });

  it('throws on non-stringifiable object', () => {
    const x = {};
    x['x'] = x;
    // tslint:disable-next-line:no-any
    expect(() => parseJSON(<any>x)).toThrow();
  });

  it('throws on invalid input type', () => {
    // tslint:disable-next-line:no-any
    expect(() => parseJSON(<any>4)).toThrow();
  });

  it('ignores children property if it is not an array', () => {
    const modified = JSON.parse(JSON.stringify(exampleAST));
    modified[1].children = {};
    const parser = <Parser>parseAST(modified);
    expect(parser.rootNodes[1].children.length).toBe(0);
    expect(parser.errors.length).toBe(1);
    expect(parser.errors[0] instanceof ChildrenMustBeAnArrayWarning).toBe(true);
  });

  it('ignores children property silently if == null', () => {
    const modified = JSON.parse(JSON.stringify(exampleAST));
    modified[1].children = null;
    const parser = <Parser>parseAST(modified);
    expect(parser.rootNodes[1].children.length).toBe(0);
    expect(parser.errors.length).toBe(0);
  });
});
