// tslint:disable:no-magic-numbers

import { InconsistentIndentationError, TooMuchIndentationError } from '../src/parse-error';

import { LmlParser } from '../src/lml-parser';

/**
 * Shorthand to create a parser object from LML string
 */
function parse(lml: string): LmlParser {
  return new LmlParser('test.lml', lml);
}

describe('LmlParser', () => {
  describe('hierarchy auto-recognition', () => {
    for (const [indentation, name] of Object.entries({'  ': '2 spaces', ' ': '1 space', '    ': '4 spaces', '\t': 'tab'})) {
      it(`should detect ${name} indentation`, () => {
        const json = parse(`div\n${indentation}span\n${indentation}${indentation}; hello\ndiv`).toJSON();
        expect(json[0].name).toBe('div');
        expect(json[0].children[0]['name']).toBe('span');
        expect(json[0].children[0].children[0]['type']).toBe('text');
        expect(json[0].children[0].children[0]['children']).toBe(undefined);
        expect(json[0].children[1]).toBe(undefined);
        expect(json[1].name).toBe('div');
        expect(json[1].children[0]).toBe(undefined);
        expect(json[2]).toBe(undefined);
      });
    }

    it('catches inconsistency error', () => {
      const parser = parse(`div\n span\n\t ; hello\ndiv`);
      expect(parser.error instanceof InconsistentIndentationError).toBe(true);
      expect(parser.errors.length).toBe(1);
    });

    it('catches too much indentation error', () => {
      const parser = parse(`div\n\tspan\n\t\t\t; hello\ndiv`);
      expect(parser.error instanceof TooMuchIndentationError).toBe(true);
      expect(parser.errors.length).toBe(1);
    });
  });

  describe('Text node', () => {
    it('is found in line start', () => {
      const json = parse('div\n; hello\n').toJSON();
      expect(json[1]['type']).toBe('text');
      expect(json[1]['data']).toBe('hello');
    });

    it('is found as a child', () => {
      const json = parse('div\n\t; hello\n').toJSON();
      expect(json[0].children[0]['type']).toBe('text');
      expect(json[0].children[0]['data']).toBe('hello');
    });
  });
});
