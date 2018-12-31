// tslint:disable:max-file-line-count no-magic-numbers

import { InconsistentIndentationCharactersError, MisplacedDirectiveError, MissingAttributeNameError,
  MissingAttributeValueError, TooMuchIndentationError, UnclosedQuoteSignError, UnexpectedQuoteSignError } from '../src/parse-error';

import { parseLML } from '../index';
import { LMLParser } from '../src/lml-parser';

/**
 * Shorthand to create a parser object from LML string
 */
function parse(lml: string): LMLParser {
  return parseLML('test.lml', lml);
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
      expect(parser.error instanceof InconsistentIndentationCharactersError).toBe(true);
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

    it('is parsed as multiline block, trims', () => {
      const json = parse(`div\n\t; hello  \n\t\t world`).toJSON();
      expect(json[0].children[0]['type']).toBe('text');
      expect(json[0].children[0]['data']).toBe('hello\nworld');
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

  describe('Element', () => {
    describe('Attribute', () => {
      it('is recognized', () => {
        const json = parse(`div\n\tspan hidden class="x" ; hello\n`).toJSON();
        expect(json[0]['children'][0].name).toBe('span');
        expect(json[0]['children'][0].attributes.length).toBe(2);
        expect(json[0]['children'][0].attributes[0].name).toBe('hidden');
        expect(json[0]['children'][0].attributes[0].value).toBeUndefined();
        expect(json[0]['children'][0].attributes[1].name).toBe('class');
        expect(json[0]['children'][0].attributes[1].value).toBe('x');
      });

      it('is recognized in multiline scenario', () => {
        const json = parse(`div\n\tspan hidden\n\t\t\\ class="x" ; hello\n`).toJSON();
        expect(json[0]['children'][0].name).toBe('span');
        expect(json[0]['children'][0].attributes.length).toBe(2);
        expect(json[0]['children'][0].attributes[0].name).toBe('hidden');
        expect(json[0]['children'][0].attributes[0].value).toBeUndefined();
        expect(json[0]['children'][0].attributes[1].name).toBe('class');
        expect(json[0]['children'][0].attributes[1].value).toBe('x');
      });

      it('is recognized in multiline scenario - with no spacing around multiline concatenator character', () => {
        const json = parse(`div\n\tspan hidden\n\t\t\\class="x" ; hello\n`).toJSON();
        expect(json[0]['children'][0].name).toBe('span');
        expect(json[0]['children'][0].attributes.length).toBe(2);
        expect(json[0]['children'][0].attributes[0].name).toBe('hidden');
        expect(json[0]['children'][0].attributes[0].value).toBeUndefined();
        expect(json[0]['children'][0].attributes[1].name).toBe('class');
        expect(json[0]['children'][0].attributes[1].value).toBe('x');
      });

      it('is recognized in multiline scenario - 3 lines', () => {
        const json = parse(`div\n\tspan\n\t\t\\ hidden\n\t\t\\ class="x"\n\t\t; hello\n`).toJSON();
        expect(json[0]['children'][0].name).toBe('span');
        expect(json[0]['children'][0].attributes.length).toBe(2);
        expect(json[0]['children'][0].attributes[0].name).toBe('hidden');
        expect(json[0]['children'][0].attributes[0].value).toBeUndefined();
        expect(json[0]['children'][0].attributes[1].name).toBe('class');
        expect(json[0]['children'][0].attributes[1].value).toBe('x');
      });

      it('recognizes single quotes', () => {
        const json = parse(`div\n\tspan [class]='{"a": "x"}'`).toJSON();
        expect(json[0]['children'][0].name).toBe('span');
        expect(json[0]['children'][0].attributes.length).toBe(1);
        expect(json[0]['children'][0].attributes[0].name).toBe('[class]');
        expect(json[0]['children'][0].attributes[0].value).toBe('{"a": "x"}');
      });

      describe('ordering', () => {
        it('uses ASCII order', () => {
          const json = parse(`div\n\tspan x Y z a`).toJSON({orderAttributes: 'ascii'});
          expect(json[0]['children'][0].name).toBe('span');
          expect(json[0]['children'][0].attributes.length).toBe(4);
          expect(json[0]['children'][0].attributes[0].name).toBe('Y');
          expect(json[0]['children'][0].attributes[1].name).toBe('a');
          expect(json[0]['children'][0].attributes[2].name).toBe('x');
          expect(json[0]['children'][0].attributes[3].name).toBe('z');
        });

        it('can do natural', () => {
          const json = parse(`div\n\tspan x Y z a`).toJSON({orderAttributes: 'natural'});
          expect(json[0]['children'][0].name).toBe('span');
          expect(json[0]['children'][0].attributes.length).toBe(4);
          expect(json[0]['children'][0].attributes[0].name).toBe('a');
          expect(json[0]['children'][0].attributes[1].name).toBe('x');
          expect(json[0]['children'][0].attributes[2].name).toBe('Y');
          expect(json[0]['children'][0].attributes[3].name).toBe('z');
        });

        it('orders for angular: #ref > *template > normal+input attributes > banana-box > event handlers', () => {
          const json = parse(`div\n\tspan x #B C #a *ngIf="x" b (tick)="do" (click)="do" [(zox)]="mox" [n]=1 [a]="a" `)
            .toJSON({orderAttributes: 'angular'});
          expect(json[0]['children'][0].name).toBe('span');
          expect(json[0]['children'][0].attributes.length).toBe(11);
          expect(json[0]['children'][0].attributes[0].name).toBe('#a');
          expect(json[0]['children'][0].attributes[1].name).toBe('#B');
          expect(json[0]['children'][0].attributes[2].name).toBe('*ngIf');
          expect(json[0]['children'][0].attributes[3].name).toBe('[a]');
          expect(json[0]['children'][0].attributes[4].name).toBe('b');
          expect(json[0]['children'][0].attributes[5].name).toBe('C');
          expect(json[0]['children'][0].attributes[6].name).toBe('[n]');
          expect(json[0]['children'][0].attributes[7].name).toBe('x');
          expect(json[0]['children'][0].attributes[8].name).toBe('[(zox)]');
          expect(json[0]['children'][0].attributes[9].name).toBe('(click)');
          expect(json[0]['children'][0].attributes[10].name).toBe('(tick)');
        });
      });

      describe('error scenario', () => {
        it('unclosed quote', () => {
          const parser = parse(`div\n\tspan class="x hidden`);
          const json = parser.toJSON();
          expect(json[0]['children'][0].name).toBe('span');
          expect(json[0]['children'][0].attributes.length).toBe(1);
          expect(json[0]['children'][0].attributes[0].name).toBe('class');
          expect(json[0]['children'][0].attributes[0].value).toBe('x hidden');
          expect(parser.error).toBeTruthy();
          expect(parser.errors.length).toBe(1);
          expect(parser.errors[0] instanceof UnclosedQuoteSignError).toBe(true);
        });

        it('missing attribute name', () => {
          const parser = parse(`div\n\tspan hidden ="a" =1 class="x"`);
          const json = parser.toJSON();
          expect(json[0]['children'][0].name).toBe('span');
          expect(json[0]['children'][0].attributes.length).toBe(2);
          expect(json[0]['children'][0].attributes[0].name).toBe('hidden');
          expect(json[0]['children'][0].attributes[1].name).toBe('class');
          expect(parser.error).toBeTruthy();
          expect(parser.errors.length).toBe(2);
          expect(parser.errors[0] instanceof MissingAttributeNameError).toBe(true);
          expect(parser.errors[1] instanceof MissingAttributeNameError).toBe(true);
        });

        it('missing value', () => {
          const parser = parse(`div\n\tspan hidden aa= class="x" bb="`);
          const json = parser.toJSON();
          expect(json[0]['children'][0].name).toBe('span');
          expect(json[0]['children'][0].attributes.length).toBe(4);
          expect(json[0]['children'][0].attributes[0].name).toBe('hidden');
          expect(json[0]['children'][0].attributes[1].name).toBe('aa');
          expect(json[0]['children'][0].attributes[1].value).toBeUndefined();
          expect(json[0]['children'][0].attributes[2].name).toBe('class');
          expect(json[0]['children'][0].attributes[3].name).toBe('bb');
          expect(json[0]['children'][0].attributes[3].value).toBeUndefined();
          expect(parser.error).toBeTruthy();
          expect(parser.errors.length).toBe(2);
          expect(parser.errors[0] instanceof MissingAttributeValueError).toBe(true);
          expect(parser.errors[1] instanceof UnclosedQuoteSignError).toBe(true);
        });

        it('omits non-attributes', () => {
          const parser = parse(`div\n\tspan *ngIf="x" = ds"ds=" class="x" (click)="l()" [(hello)]="xs" [lol]="oh" /`);
          const json = parser.toJSON();
          expect(json[0]['children'][0].name).toBe('span');
          expect(json[0]['children'][0].attributes.length).toBe(5);
          expect(json[0]['children'][0].attributes[0].name).toBe('*ngIf');
          expect(json[0]['children'][0].attributes[0].value).toBe('x');
          expect(json[0]['children'][0].attributes[1].name).toBe('class');
          expect(json[0]['children'][0].attributes[1].value).toBe('x');
          expect(json[0]['children'][0].attributes[2].name).toBe('(click)');
          expect(json[0]['children'][0].attributes[2].value).toBe('l()');
          expect(json[0]['children'][0].attributes[3].name).toBe('[(hello)]');
          expect(json[0]['children'][0].attributes[3].value).toBe('xs');
          expect(json[0]['children'][0].attributes[4].name).toBe('[lol]');
          expect(json[0]['children'][0].attributes[4].value).toBe('oh');
          expect(parser.error).toBeTruthy();
          expect(parser.errors.length).toBe(2);
          expect(parser.errors[0] instanceof MissingAttributeNameError).toBe(true);
          expect(parser.errors[1] instanceof UnexpectedQuoteSignError).toBe(true);
        });
      });
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
