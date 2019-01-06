import { parseLML } from '../index';
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
});
