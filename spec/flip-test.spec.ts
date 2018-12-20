import { readFileSync } from 'fs';

import { AstParser } from '../src/ast-parser';
import { HtmlParser } from '../src/html-parser';
import { JsonParser } from '../src/json-parser';
import { LmlParser } from '../src/lml-parser';

import { strDiff } from './helpers/str-diff';

const QUOTE_LEN = 80;

describe('Parser', () => {
  const html = readFileSync(__dirname + '/rsc/test1.html', 'utf8');

  const lml1 = (new HtmlParser('test.html', html)).toLML();
  const html1 = (new LmlParser('1.lml', lml1)).toHTML();
  const lml2 = (new HtmlParser('1.html', html1)).toLML();
  const html2 = (new LmlParser('2.lml', lml2)).toHTML();
  const ast1 = (new HtmlParser('2.html', html2)).toAST();
  const json1 = (new AstParser('1.ast', ast1)).toJSON();
  const html3 = (new JsonParser('1.json', json1)).toHTML();
  const json2 = (new HtmlParser('3.html', html3)).toJSON();
  const ast2 = (new JsonParser('2.json', JSON.stringify(json2))).toAST();
  const lml3 = (new AstParser('2.ast', JSON.stringify(ast2))).toString();

  it('works with consistent outputs', () => {
    let d = strDiff(lml1, lml2);
    if (d > -1) {
      console.log('lml diff', JSON.stringify(lml1.substr(d, QUOTE_LEN)), 'VS', JSON.stringify(lml2.substr(d, QUOTE_LEN)));
    }
    expect(lml1).toBe(lml2, 'LML outputs');

    d = strDiff(html1, html2);
    if (d > -1) {
      console.log('html diff', JSON.stringify(html1.substr(d, QUOTE_LEN)), 'VS', JSON.stringify(html2.substr(d, QUOTE_LEN)));
    }
    expect(html1).toBe(html2, 'HTML outputs');

    expect(lml2).toBe(lml3, 'After AST and JSON');
  });
});
