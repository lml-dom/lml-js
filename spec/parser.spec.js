require('jasmine');
const { readFileSync } = require('fs');
const strDiff = require('./util/str-diff');

const HtmlParser = require('../lib/src/html-parser').HtmlParser;
const LmlParser = require('../lib/src/lml-parser').LmlParser;

describe('Parser', () => {
  const html = readFileSync(__dirname + '/rsc/test1.html', 'utf8');

  const lml1 = (new HtmlParser('test.html', html)).toLml();
  const html1 = (new LmlParser('1.lml', lml1)).toHtml();
  const lml2 = (new HtmlParser('1.html', html1)).toLml();
  const html2 = (new LmlParser('2.lml', lml2)).toHtml();

  it('works with consistent outputs', () => {
    let d = strDiff(lml1, lml2);
    if (d > -1) {
      console.log('lml diff', JSON.stringify(lml1.substr(d, 80)), 'VS', JSON.stringify(lml2.substr(d, 80)));
      console.log('lml1 errors', lml1.errors);
      console.log('lml2 errors', lml1.errors);
    }
    expect(lml1).toBe(lml2, 'LML outputs');

    d = strDiff(html1, html2);
    if (d > -1) {
      console.log('html diff', JSON.stringify(html1.substr(d, 80)), 'VS', JSON.stringify(html2.substr(d, 80)));
      console.log('html1 errors', html1.errors);
      console.log('html2 errors', html1.errors);
    }
    expect(html1).toBe(html2, 'HTML outputs');
  });
});
