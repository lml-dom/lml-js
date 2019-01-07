// tslint:disable:max-file-line-count no-magic-numbers

import { parseLML } from '../index';
import { InconsistentIndentationCharactersWarning, InconsistentIndentationWarning, InvalidMultilineAttributeWarning,
  MisplacedDirectiveWarning, MultilineAttributeIndentationWarning, TooMuchIndentationWarning } from '../src/parser/parse-warning';

describe('LMLParser', () => {
  describe('configuration', () => {
    it('throws on invalid indentation', () => {
      expect(() => parseLML('div ; x', {indentation: '\t '})).toThrow();
    });
  });

  describe('hierarchy auto-recognition', () => {
    for (const [indentation, name] of Object.entries({'  ': '2 spaces', ' ': '1 space', '    ': '4 spaces', '\t': 'tab'})) {
      it(`should detect ${name} indentation`, () => {
        const json = parseLML(`div\n${indentation}span\n${indentation}${indentation}; hello\ndiv`).toJSON();
        expect(json[0].name).toBe('div');
        expect(json[0].children[0].name).toBe('span');
        expect(json[0].children[0].children[0].type).toBe('text');
        expect(json[0].children[0].children[0].children).toBe(undefined);
        expect(json[0].children.length).toBe(1);
        expect(json[1].name).toBe('div');
        expect(json[1].children).toBeUndefined();
        expect(json[2]).toBe(undefined);
      });
    }

    it('catches character inconsistency', () => {
      const parser = parseLML(`div\n span\n\t ; hello\ndiv`);
      const json = parser.toJSON();
      expect(parser.errors[0] instanceof InconsistentIndentationCharactersWarning).toBe(true);
      expect(parser.errors.length).toBe(1);
      expect(json[0].children[0].children[0].data).toBe('hello');
    });

    it('catches level inconsistency', () => {
      const parser = parseLML(`div\n  span\n   ; hello\ndiv`);
      const json = parser.toJSON();
      expect(parser.errors[0] instanceof InconsistentIndentationWarning).toBe(true);
      expect(parser.errors.length).toBe(1);
      expect(json[0].children[0].children[0].data).toBe('hello');
    });

    it('catches too much indentation', () => {
      const parser = parseLML(`div\n\tspan\n\t\t\t; hello\ndiv`);
      const json = parser.toJSON();
      expect(parser.errors[0] instanceof TooMuchIndentationWarning).toBe(true);
      expect(parser.errors.length).toBe(1);
      expect(json[0].children[0].children[0].data).toBe('hello');
    });

    it('catches directive being in a block indentation', () => {
      const parser = parseLML(`\t!DOCTYPE html\n\thtml\n\t\thead\n\t\tbody`);
      expect(parser.errors[0] instanceof MisplacedDirectiveWarning).toBe(true);
      expect(parser.errors.length).toBe(1);
    });

    it('catches directive being indented', () => {
      const parser = parseLML(`\t!DOCTYPE html\nhtml\n\thead\n\tbody`);
      expect(parser.errors[0] instanceof MisplacedDirectiveWarning).toBe(true);
      expect(parser.errors.length).toBe(1);
    });

    it('catches directive not being the first item', () => {
      const parser = parseLML(`html\n\thead\n\tbody\n!DOCTYPE html`);
      expect(parser.errors[0] instanceof MisplacedDirectiveWarning).toBe(true);
      expect(parser.errors.length).toBe(1);
    });
  });

  describe('Comment node', () => {
    it('is found in line start', () => {
      const json = parseLML(`div\n# hello\n`).toJSON();
      expect(json[1].type).toBe('comment');
      expect(json[1].data).toBe('hello');
    });

    it('can be multiline', () => {
      const json = parseLML(`div\n# hello\n\tworld\n`).toJSON();
      expect(json[1].type).toBe('comment');
      expect(json[1].data).toBe('hello\nworld');
    });

    it('is trimmed', () => {
      const json = parseLML(`div\n\t# hello  \n\t\t  world   \n\tdiv`).toJSON();
      expect(json[0].children[0].type).toBe('comment');
      expect(json[0].children[0].data).toBe('hello\n  world');
    });

    it('is not recognized after a tag', () => {
      const json = parseLML(`div # hello`).toJSON();
      expect(json[0].children).toBeUndefined();
      expect(json[0].name).toBe('div');
      expect(json['length']).toBe(1);
    });
  });

  describe('CDATA node', () => {
    it('value is stored on a text node under the CDATA node', () => {
      const json = parseLML(`div\n$ hello\n`).toJSON();
      expect(json[1].type).toBe('cdata');
      expect(json[1].children[0].type).toBe('text');
      expect(json[1].children[0].data).toBe(' hello');
    });

    it('does not have a text child if empty', () => {
      const json = parseLML(`div\n$\ndiv`).toJSON();
      expect(json[1].type).toBe('cdata');
      expect(json[1].children).toBeUndefined();
    });

    it('is found in line start', () => {
      const json = parseLML(`div\n$ hello\n`).toJSON();
      expect(json[1].type).toBe('cdata');
      expect(json[1].children[0].type).toBe('text');
      expect(json[1].children[0].data).toBe(' hello');
    });

    it('can be multiline', () => {
      const json = parseLML(`div\n$ hello\n\tworld\n`).toJSON();
      expect(json[1].type).toBe('cdata');
      expect(json[1].children[0].type).toBe('text');
      expect(json[1].children[0].data).toBe(' hello\nworld');
    });

    it('is not trimmed', () => {
      const json = parseLML(`div\n\t$    hello  \n\t\t  world   \n`).toJSON();
      expect(json[0].children[0].type).toBe('cdata');
      expect(json[0].children[0].children[0].type).toBe('text');
      expect(json[0].children[0].children[0].data).toBe('    hello  \n  world   ');
    });

    it('is not recognized after a tag', () => {
      const json = parseLML(`div $ hello`).toJSON();
      expect(json[0].children).toBeUndefined();
      expect(json[0].name).toBe('div');
      expect(json['length']).toBe(1);
    });
  });

  describe('Text node', () => {
    it('is found in line start', () => {
      const json = parseLML(`div\n; hello\n`).toJSON();
      expect(json[1].type).toBe('text');
      expect(json[1].data).toBe('hello');
    });

    it('is found as a child', () => {
      const json = parseLML(`div\n\t; hello\n`).toJSON();
      expect(json[0].children[0].type).toBe('text');
      expect(json[0].children[0].data).toBe('hello');
    });

    it('is parsed as multiline block, trims', () => {
      const json = parseLML(`div\n\t; hello  \n\t\t world`).toJSON();
      expect(json[0].children[0].type).toBe('text');
      expect(json[0].children[0].data).toBe('hello\n world');
    });

    it('is found after tag as child, and is not multiline', () => {
      const json = parseLML(`div class="x" ; hello\n\tdiv`).toJSON();
      expect(json[0].children[0].type).toBe('text');
      expect(json[0].children[0].data).toBe('hello');
      expect(json[0].children[1].name).toBe('div');
    });

    it('is found after tag as child, even if attribute finishes in `=`', () => {
      const json = parseLML(`div class= ; hello\n\tdiv`).toJSON();
      expect(json[0].children[0].type).toBe('text');
      expect(json[0].children[0].data).toBe('hello');
      expect(json[0].children[1].name).toBe('div');
    });

    for (const [l, r] of [['\t', '\t'], ['  ', ' '], [' ', ''], ['', ' '], ['', '']]) {
      it('is found after value-attribute, even with semicolon not well separated: ' + JSON.stringify([l, r]), () => {
        const json = parseLML(`div class="x"${l};${r}hello\n\tdiv`).toJSON();
        expect(json[0].children[0].type).toBe('text', `using: ${JSON.stringify([l, r])}`);
        expect(json[0].children[0].data).toBe('hello', `using: ${JSON.stringify([l, r])}`);
      });

      it('is found after empty attribute, even with semicolon not well separated: ' + JSON.stringify([l, r]), () => {
        const json = parseLML(`div hidden${l};${r}hello\n\tdiv`).toJSON();
        expect(json[0].children[0].type).toBe('text', `using: ${JSON.stringify([l, r])}`);
        expect(json[0].children[0].data).toBe('hello', `using: ${JSON.stringify([l, r])}`);
      });
    }

    it('inline text is ignored if empty', () => {
      const json = parseLML(`div\n\tspan hidden class="x" ; \n\tdiv`).toJSON();
      expect(json[0].children.length).toBe(2);
      expect(json[0].children[0].name).toBe('span');
      expect(json[0].children[0].children).toBeUndefined();
    });

    it('inline text is ignored if empty (multiline)', () => {
      const json = parseLML(`div\n\tspan hidden\n\t\t\\ class="x" ; \n\tdiv`).toJSON();
      expect(json[0].children.length).toBe(2);
      expect(json[0].children[0].name).toBe('span');
      expect(json[0].children[0].children).toBeUndefined();
    });
  });

  describe('Element', () => {
    describe('text block elements', () => {
      describe('script', () => {
        it('gets trimmed when value is inline', () => {
          const json = parseLML(`div\n\tscript ;  alert(); \n`).toJSON();
          expect(json[0].children[0].name).toBe('script');
          expect(json[0].children[0].children[0].type).toBe('text');
          expect(json[0].children[0].children[0].data).toBe('alert();');
        });

        it('gets block (un)indented and trimmed', () => {
          const json = parseLML(`div\n\tscript\n\n\t\t\t\talert();\n\t\t\t\t\tworld();\t\n\n\n`).toJSON();
          expect(json[0].children[0].name).toBe('script');
          expect(json[0].children[0].children[0].type).toBe('text');
          expect(json[0].children[0].children[0].data).toBe('alert();\n\tworld();');
        });
      });

      describe('style', () => {
        it('gets trimmed when value is inline', () => {
          const json = parseLML(`div\n\tstyle ;  .x { color: red; } \n`).toJSON();
          expect(json[0].children[0].name).toBe('style');
          expect(json[0].children[0].children[0].type).toBe('text');
          expect(json[0].children[0].children[0].data).toBe('.x { color: red; }');
        });

        it('gets block (un)indented and trimmed', () => {
          const json = parseLML(`div\n\tstyle\n\n\t\t\t\t.x {\n\t\t\t\t\tcolor: red;\n\t\t\t\t}  \n\n`).toJSON();
          expect(json[0].children[0].name).toBe('style');
          expect(json[0].children[0].children[0].type).toBe('text');
          expect(json[0].children[0].children[0].data).toBe('.x {\n\tcolor: red;\n}');
        });
      });

      describe('textarea', () => {
        it('inline value is value safe', () => {
          const json = parseLML(`div\n\ttextarea ; hello\n`).toJSON();
          expect(json[0].children[0].name).toBe('textarea');
          expect(json[0].children[0].children[0].type).toBe('text');
          expect(json[0].children[0].children[0].data).toBe(' hello');
        });

        it('semicolon is not parsed for child value, and is value safe', () => {
          const json = parseLML(`div\n\ttextarea\n\t\t; hello \n`).toJSON();
          expect(json[0].children[0].name).toBe('textarea');
          expect(json[0].children[0].children[0].type).toBe('text');
          expect(json[0].children[0].children[0].data).toBe('; hello ');
        });
      });
    });

    describe('Attribute', () => {
      it('is recognized', () => {
        const json = parseLML(`div\n\tspan hidden class="x" ; hello\n`).toJSON();
        expect(json[0].children[0].name).toBe('span');
        expect(json[0].children[0].attributes.length).toBe(2);
        expect(json[0].children[0].attributes[0].name).toBe('hidden');
        expect(json[0].children[0].attributes[0].value).toBeUndefined();
        expect(json[0].children[0].attributes[1].name).toBe('class');
        expect(json[0].children[0].attributes[1].value).toBe('x');
      });

      it('is recognized in multiline scenario', () => {
        const json = parseLML(`div\n\tspan hidden\n\t\t\\ class="x" ; hello\n`).toJSON();
        expect(json[0].children[0].name).toBe('span');
        expect(json[0].children[0].attributes.length).toBe(2);
        expect(json[0].children[0].attributes[0].name).toBe('hidden');
        expect(json[0].children[0].attributes[0].value).toBeUndefined();
        expect(json[0].children[0].attributes[1].name).toBe('class');
        expect(json[0].children[0].attributes[1].value).toBe('x');
      });

      it('is recognized in multiline scenario - with no spacing around multiline concatenator character', () => {
        const json = parseLML(`div\n\tspan hidden\n\t\t\\class="x" ; hello\n`).toJSON();
        expect(json[0].children[0].name).toBe('span');
        expect(json[0].children[0].attributes.length).toBe(2);
        expect(json[0].children[0].attributes[0].name).toBe('hidden');
        expect(json[0].children[0].attributes[0].value).toBeUndefined();
        expect(json[0].children[0].attributes[1].name).toBe('class');
        expect(json[0].children[0].attributes[1].value).toBe('x');
      });

      it('is recognized in multiline scenario - 3 lines', () => {
        const json = parseLML(`div\n\tspan\n\t\t\\ hidden\n\t\t\\ class="x"\n\t\t; hello\n`).toJSON();
        expect(json[0].children[0].name).toBe('span');
        expect(json[0].children[0].attributes.length).toBe(2);
        expect(json[0].children[0].attributes[0].name).toBe('hidden');
        expect(json[0].children[0].attributes[0].value).toBeUndefined();
        expect(json[0].children[0].attributes[1].name).toBe('class');
        expect(json[0].children[0].attributes[1].value).toBe('x');
      });

      it('invalid multiline attribute concatenation, will ignore line', () => {
        const parser = parseLML(`!DOCTYPE html\n  \\ x y z\nhtml\n  head\n  body\n    ; hello`);
        const json = parser.toJSON();
        expect(parser.errors[0] instanceof InvalidMultilineAttributeWarning).toBe(true);
        expect(parser.errors.length).toBe(1);
        expect(json.length).toBe(2);
        expect(json[0].type).toBe('directive');
        expect(json[0].data).toBe('!DOCTYPE html');
        expect(json[1].name).toBe('html');
      });

      it('any indentation goes for multiline attributes, but generates warning', () => {
        const parser = parseLML(`div\n  span hidden\n \\ class="x" ; hello\n`);
        const json = parser.toJSON();
        expect(json[0].children[0].name).toBe('span');
        expect(json[0].children[0].attributes.length).toBe(2);
        expect(json[0].children[0].attributes[0].name).toBe('hidden');
        expect(json[0].children[0].attributes[0].value).toBeUndefined();
        expect(json[0].children[0].attributes[1].name).toBe('class');
        expect(json[0].children[0].attributes[1].value).toBe('x');
        expect(parser.errors.length).toBe(1);
        expect(parser.errors[0] instanceof MultilineAttributeIndentationWarning).toBe(true);
      });
    });
  });

  describe('empty line', () => {
    it('is ignored generally', () => {
      const parser = parseLML(`\n\n!DOCTYPE html\n\n\nhtml\n\thead\n\n\tbody\n\t\t; hello`);
      const json = parser.toJSON();
      expect(json.length).toBe(2);
      expect(json[0].type).toBe('directive');
      expect(json[1].name).toBe('html');
      expect(parser.errors.length).toBe(0);
    });
  });

  it('space is trimmed', () => {
    const json = parseLML(`div class="x"\n\t;   hello  \n\tdiv`).toJSON();
    expect(json[0].children[0].type).toBe('text');
    expect(json[0].children[0].data).toBe('hello');
  });

  it('space is trimmed (multiline)', () => {
    const json = parseLML(`div class="x"\n\t;   hello\n\t\tworld   \n\tdiv`).toJSON();
    expect(json[0].children[0].type).toBe('text');
    expect(json[0].children[0].data).toBe('hello\nworld');
  });

  it('space is trimmed (after tag)', () => {
    const json = parseLML(`div class="x" ;   hello\n\tdiv`).toJSON();
    expect(json[0].children[0].type).toBe('text');
    expect(json[0].children[0].data).toBe('hello');
  });
});
