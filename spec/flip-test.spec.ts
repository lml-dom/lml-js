import { readFileSync } from 'fs';

import { parseAST, parseHTML, parseJSON, parseLML } from '../index';

import { strDiff } from './helpers/str-diff';

const QUOTE_LEN = 80;

describe('Parser', () => {
  const html = readFileSync(__dirname + '/rsc/test1.html', 'utf8');

  const parser1 = parseHTML('test.html', html);
  const lml1 = parser1.toLML();
  const html2 = parseLML('1.lml', lml1).toHTML();
  const lml3 = parseHTML('2.html', html2).toLML();
  const html4 = parseLML('3.lml', lml3).toHTML();
  const ast5 = parseHTML('4.html', html4).toAST();
  const json6 = parseAST('5.ast', ast5).toJSON();
  const html7 = parseJSON('6.json', json6).toHTML();
  const json8 = parseHTML('7.html', html7).toJSON();
  const ast9 = parseJSON('8.json', json8).toAST();
  const lml10 = parseAST('9.ast', JSON.stringify(ast9)).toString();

  it('works with consistent outputs', () => {
    let d = strDiff(lml1, lml3);
    if (d > -1) {
      console.log('lml diff', JSON.stringify(lml1.substr(d, QUOTE_LEN)), 'VS', JSON.stringify(lml3.substr(d, QUOTE_LEN)));
    }
    expect(lml1).toBe(lml3, 'LML outputs');

    d = strDiff(html2, html4);
    if (d > -1) {
      console.log('html diff', JSON.stringify(html2.substr(d, QUOTE_LEN)), 'VS', JSON.stringify(html4.substr(d, QUOTE_LEN)));
    }
    expect(html2).toBe(html4, 'HTML outputs');

    expect(lml3).toBe(lml10, 'After AST and JSON');
  });
});
