require('jasmine');

const HtmlParser = require('../lib/src/html-parser').HtmlParser;
const LmlParser = require('../lib/src/lml-parser').LmlParser;

const html = `
<!DOCTYPE html>
<html>
<head>
  <script type="text/javascript" src="x.js"></script>
  <script type="text/javascript">x();</script>
  <![CDATA[ some characters ]]>
</head>
<body>
  <div col=21 hidden *ngFor="let item of items; let i = index" class="blds-check-wrap blds-margin-bottom--5">
  <input class="switch-input" [checked]="item.value === 'value'" [id]="uid + '-' + i"
    [name]="name" type="radio" [value]="item.value" (blur)="focused = false" (click)="value = item.value" (focus)="focused = true"
  >
  <!-- heh
    hahha  -->
  <![CDATA[  mis-
 formatted ]]>
  <style>
    .oops { color: red; }
  </style>
  <script type="text/javascript">
    alert(1);
    alert(2);
  </script>
    <textarea rows=10 cols="2"> fds
      fds
 fds  </textarea>
    <pre class="xx yy"> fds
  fds
 fds  </pre>

  <label [for]="uid + '-' + i">
    {{ item.label }}
    hello
  </label>
  </div>
</body>
</html>

`;

function strDiff(a, b) {
  const len = Math.min(a.length, b.length);

  for (var i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return i;
    } 
  }

  if (a.length !== b.length) {
    return len;
  }

  return -1;
}

describe('Parser', () => {
  const lml1 = (new HtmlParser('test.html', html)).toLml();
  const html1 = (new LmlParser('1.lml', lml1)).toHtml();
  const lml2 = (new HtmlParser('1.html', html1)).toLml();
  const html2 = (new LmlParser('2.lml', lml2)).toHtml();

  it('works with consistent outputs', () => {
    let d = strDiff(lml1, lml2);
    if (d > -1) {
      console.log('lml diff', JSON.stringify(lml1.substr(d, 80)), 'VS', JSON.stringify(lml2.substr(d, 80)));
    }
    expect(lml1).toBe(lml2, 'LML outputs');

    d = strDiff(html1, html2);
    if (d > -1) {
      console.log('html diff', JSON.stringify(html1.substr(d, 80)), 'VS', JSON.stringify(html2.substr(d, 80)));
    }
    expect(html1).toBe(html2, 'HTML outputs');
  });
});
