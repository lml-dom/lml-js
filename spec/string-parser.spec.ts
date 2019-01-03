// tslint:disable:max-file-line-count no-magic-numbers

import { parseLML } from '../index';
import { InvalidAttributeNameWarning, InvalidAttributeValueWarning, InvalidQuoteSignWarning } from '../src/parser/parse-warning';

describe('StringParser', () => {
  it('throws on invalid source', () => {
    // tslint:disable-next-line:no-any
    expect(() => parseLML(<any>false)).toThrow();
  });

  describe('Element', () => {
    describe('Attribute', () => {
      it('parses attributes', () => {
        const parser = parseLML(`span class="abc def" hidden`);
        const json = parser.toJSON();
        expect(json[0].attributes.length).toBe(2);
        expect(json[0].attributes[0].name).toBe('class');
        expect(json[0].attributes[0].value).toBe('abc def');
        expect(json[0].attributes[1].name).toBe('hidden');
        expect(json[0].attributes[1].value).toBeUndefined();
        expect(parser.errors.length).toBe(0);
      });

      describe('error scenario', () => {
        for (const [l, r] of [['\t', '\t'], ['  ', ' '], [' ', ''], ['', ' '], ['', '']]) {
          it('liberally used whitespace around `=` quoted value - ' + JSON.stringify([l, r]), () => {
            const json = parseLML(`div class${l}=${r}"abc def" hidden ; hello\n\tdiv`).toJSON();
            expect(json[0].attributes.length).toBe(2);
            expect(json[0].attributes[0].name).toBe('class', `using: ${JSON.stringify([l, r])}`);
            expect(json[0].attributes[0].value).toBe('abc def', `using: ${JSON.stringify([l, r])}`);
            expect(json[0].attributes[1].name).toBe('hidden', `using: ${JSON.stringify([l, r])}`);
          });

          it('liberally used whitespace around `=` non-quoted value - ' + JSON.stringify([l, r]), () => {
            const json = parseLML(`div class${l}=${r}abc hidden ; hello\n\tdiv`).toJSON();
            expect(json[0].attributes[0].name).toBe('class', `using: ${JSON.stringify([l, r])}`);
            expect(json[0].attributes[0].value).toBe('abc', `using: ${JSON.stringify([l, r])}`);
            expect(json[0].attributes[1].name).toBe('hidden', `using: ${JSON.stringify([l, r])}`);
          });
        }

        it('unclosed quote', () => {
          const parser = parseLML(`span class="x hidden`);
          const json = parser.toJSON();
          expect(json[0].attributes.length).toBe(1);
          expect(json[0].attributes[0].name).toBe('class');
          expect(json[0].attributes[0].value).toBe('x hidden');
          expect(parser.errors[0] instanceof InvalidQuoteSignWarning).toBe(true);
          expect(parser.errors.length).toBe(1);
          expect(parser.errors[0].span.start.col).toBe(11);
          expect(parser.errors[0].span.end.col).toBe(12);
        });

        it('missing attribute name', () => {
          const parser = parseLML(`span x="y" ="a" =1 class="x"`);
          const json = parser.toJSON();
          expect(json[0].attributes.length).toBe(2);
          expect(json[0].attributes[0].name).toBe('x');
          expect(json[0].attributes[0].value).toBe('y');
          expect(json[0].attributes[1].name).toBe('class');
          expect(json[0].attributes[1].value).toBe('x');
          expect(parser.errors.length).toBe(2);
          expect(parser.errors[0] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[0].span.start.col).toBe(11);
          expect(parser.errors[0].span.end.col).toBe(12);
          expect(parser.errors[1] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[1].span.start.col).toBe(16);
          expect(parser.errors[1].span.end.col).toBe(17);
        });

        it('missing value (one quote)', () => {
          const parser = parseLML(`span hidden aa="`);
          const json = parser.toJSON();
          expect(json[0].attributes.length).toBe(2);
          expect(json[0].attributes[0].name).toBe('hidden');
          expect(json[0].attributes[0].value).toBeUndefined();
          expect(json[0].attributes[1].name).toBe('aa');
          expect(json[0].attributes[1].value).toBeUndefined();
          expect(parser.errors.length).toBe(1);
          expect(parser.errors[0] instanceof InvalidQuoteSignWarning).toBe(true);
          expect(parser.errors[0].span.start.col).toBe(15);
          expect(parser.errors[0].span.end.col).toBe(16);
        });

        it('missing value (unquoted)', () => {
          const parser = parseLML(`span hidden aa=`);
          const json = parser.toJSON();
          expect(json[0].attributes.length).toBe(2);
          expect(json[0].attributes[0].name).toBe('hidden');
          expect(json[0].attributes[0].value).toBeUndefined();
          expect(json[0].attributes[1].name).toBe('aa');
          expect(json[0].attributes[1].value).toBeUndefined();
          expect(parser.errors.length).toBe(1);
          expect(parser.errors[0] instanceof InvalidAttributeValueWarning).toBe(true);
          expect(parser.errors[0].span.start.col).toBe(14);
          expect(parser.errors[0].span.end.col).toBe(15);
        });

        it('quote does not follow `=`', () => {
          const parser = parseLML(`div class=a"x"`);
          const json = parser.toJSON();
          expect(json[0].attributes.length).toBe(1);
          expect(json[0].attributes[0].name).toBe('class');
          expect(json[0].attributes[0].value).toBe('a"x"');
          expect(parser.errors.length).toBe(1);
          expect(parser.errors[0] instanceof InvalidQuoteSignWarning).toBe(true);
          expect(parser.errors[0].span.start.col).toBe(10);
          expect(parser.errors[0].span.end.col).toBe(14);
        });

        it('handles empty value and quoted attribute name', () => {
          const parser = parseLML(`div "a"="xa" "b" 'c'="xc" 'd' ds"a"="" hidden`);
          const json = parser.toJSON();
          expect(json[0].attributes.length).toBe(1);
          expect(json[0].attributes[0].name).toBe('hidden');
          expect(json[0].attributes[0].value).toBeUndefined();
          expect(parser.errors.length).toBe(5);

          expect(parser.errors[0] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[0].span.start.col).toBe(4);
          expect(parser.errors[0].span.end.col).toBe(7);

          expect(parser.errors[1] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[1].span.start.col).toBe(13);
          expect(parser.errors[1].span.end.col).toBe(16);

          expect(parser.errors[2] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[2].span.start.col).toBe(17);
          expect(parser.errors[2].span.end.col).toBe(20);

          expect(parser.errors[3] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[3].span.start.col).toBe(26);
          expect(parser.errors[3].span.end.col).toBe(29);

          expect(parser.errors[4] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[4].span.start.col).toBe(30);
          expect(parser.errors[4].span.end.col).toBe(35);
        });

        it('omits non-attributes', () => {
          const parser = parseLML(`span *ngIf="x" = ds"ds=" class="x" (click)="l()" [(hello)]="xs" [lol]="oh"`);
          const json = parser.toJSON();
          expect(json[0].attributes.length).toBe(5);
          expect(json[0].attributes[0].name).toBe('*ngIf');
          expect(json[0].attributes[0].value).toBe('x');
          expect(json[0].attributes[1].name).toBe('class');
          expect(json[0].attributes[1].value).toBe('x');
          expect(json[0].attributes[2].name).toBe('(click)');
          expect(json[0].attributes[2].value).toBe('l()');
          expect(json[0].attributes[3].name).toBe('[(hello)]');
          expect(json[0].attributes[3].value).toBe('xs');
          expect(json[0].attributes[4].name).toBe('[lol]');
          expect(json[0].attributes[4].value).toBe('oh');
          expect(parser.errors[0] instanceof InvalidAttributeNameWarning).toBe(true);
          expect(parser.errors[0].span.start.col).toBe(15);
          expect(parser.errors[0].span.end.col).toBe(16);
          expect(parser.errors.length).toBe(1);
        });
      });
    });
  });
});
