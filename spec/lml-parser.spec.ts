// tslint:disable:no-magic-numbers

import { InconsistentIndentationError, MisplacedDirectiveError, TooMuchIndentationError } from '../src/parse-error';

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

    it('catches directive being indented', () => {
      const parser = parse(`\t!DOCTYPE html\n\thtml\n\t\thead\n\t\tbody`);
      expect(parser.error instanceof MisplacedDirectiveError).toBe(true);
      expect(parser.errors.length).toBe(1);
    });
  });

  describe('Comment node', () => {
    it('is found in line start', () => {
      const json = parse(`div\n# hello\n`).toJSON();
      expect(json[1]['type']).toBe('comment');
      expect(json[1]['data']).toBe('hello');
    });

    it('can be multiline', () => {
      const json = parse(`div\n# hello\n\tworld\n`).toJSON();
      expect(json[1]['type']).toBe('comment');
      expect(json[1]['data']).toBe('hello\nworld');
    });

    it('is trimmed', () => {
      const json = parse(`div\n#    hello  \n\t  world   \n`).toJSON();
      expect(json[1]['type']).toBe('comment');
      expect(json[1]['data']).toBe('hello\nworld');
    });

    it('is not recognized after a tag', () => {
      const json = parse(`div # hello`).toJSON();
      expect(json[0]['children'].length).toBe(0);
      expect(json[0]['name']).toBe('div');
      expect(json['length']).toBe(1);
    });
  });

  describe('CDATA node', () => {
    it('value is stored on a text node under the CDATA node', () => {
      const json = parse(`div\n$ hello\n`).toJSON();
      expect(json[1]['type']).toBe('cdata');
      expect(json[1]['children'][0]['type']).toBe('text');
      expect(json[1]['children'][0]['data']).toBe(' hello');
    });

    it('is found in line start', () => {
      const json = parse(`div\n$ hello\n`).toJSON();
      expect(json[1]['type']).toBe('cdata');
      expect(json[1]['children'][0]['type']).toBe('text');
      expect(json[1]['children'][0]['data']).toBe(' hello');
    });

    it('can be multiline', () => {
      const json = parse(`div\n$ hello\n\tworld\n`).toJSON();
      expect(json[1]['type']).toBe('cdata');
      expect(json[1]['children'][0]['type']).toBe('text');
      expect(json[1]['children'][0]['data']).toBe(' hello\nworld');
    });

    it('is not trimmed', () => {
      const json = parse(`div\n\t$    hello  \n\t\t  world   \n`).toJSON();
      expect(json[0]['children'][0]['type']).toBe('cdata');
      expect(json[0]['children'][0]['children'][0]['type']).toBe('text');
      expect(json[0]['children'][0]['children'][0]['data']).toBe('    hello  \n  world   ');
    });

    it('is not recognized after a tag', () => {
      const json = parse(`div $ hello`).toJSON();
      expect(json[0]['children'].length).toBe(0);
      expect(json[0]['name']).toBe('div');
      expect(json['length']).toBe(1);
    });
  });

  describe('Text node', () => {
    it('is found in line start', () => {
      const json = parse(`div\n; hello\n`).toJSON();
      expect(json[1]['type']).toBe('text');
      expect(json[1]['data']).toBe('hello');
    });

    it('is found as a child', () => {
      const json = parse(`div\n\t; hello\n`).toJSON();
      expect(json[0].children[0]['type']).toBe('text');
      expect(json[0].children[0]['data']).toBe('hello');
    });

    it('is parsed as multiline block and retains extra spaces', () => {
      const json = parse(`div\n\t; hello  \n\t\t world`).toJSON();
      expect(json[0].children[0]['type']).toBe('text');
      expect(json[0].children[0]['data']).toBe('hello  \n world');
    });

    it('is found after tag as child, and is not multiline', () => {
      const json = parse(`div class="x" ; hello\n\tdiv`).toJSON();
      expect(json[0].children[0]['type']).toBe('text');
      expect(json[0].children[0]['data']).toBe('hello');
      expect(json[0].children[1]['name']).toBe('div');
    });

    it('is found even with semicolon not well separated', () => {
      for (const [l, r] of [['\t', '\t'], ['  ', ' '], [' ', ''], ['', ' '], ['', '']]) {
        const json = parse(`div class="x"${l};${r}hello\n\tdiv`).toJSON();
        expect(json[0].children[0]['type']).toBe('text', `using: ${JSON.stringify([l, r])}`);
        expect(json[0].children[0]['data']).toBe('hello', `using: ${JSON.stringify([l, r])}`);
      }
    });
  });

  it('space is trimmed', () => {
    const json = parse(`div class="x"\n\t;   hello  \n\tdiv`).toJSON();
    expect(json[0].children[0]['type']).toBe('text');
    expect(json[0].children[0]['data']).toBe('hello');
  });

  it('space is trimmed (multiline)', () => {
    const json = parse(`div class="x"\n\t;   hello\n\t\tworld   \n\tdiv`).toJSON();
    expect(json[0].children[0]['type']).toBe('text');
    expect(json[0].children[0]['data']).toBe('hello\nworld');
  });

  it('space is trimmed (after tag)', () => {
    const json = parse(`div class="x" ;   hello\n\tdiv`).toJSON();
    expect(json[0].children[0]['type']).toBe('text');
    expect(json[0].children[0]['data']).toBe('hello');
  });
});
