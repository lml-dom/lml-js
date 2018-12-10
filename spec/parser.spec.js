require('jasmine');

const HtmlParser = require('../lib/src/html-parser').HtmlParser;
const LmlParser = require('../lib/src/lml-parser').LmlParser;

const html = `
<!DOCTYPE html>
<html>
<head>
  <script type="text/javascript" src="x.js">
  <script type="text/javascript">x();</script>
  <![CDATA[ some characters ]]>
</head>
<body>
  <div col=21 hidden *ngFor="let item of items; let i = index" class="blds-check-wrap blds-margin-bottom--5">
  <input class="switch-input" [checked]="item.value === 'value'" [id]="uid + '-' + i"
    [name]="name" type="radio" [value]="item.value" (blur)="focused = false" (click)="value = item.value" (focus)="focused = true"
  >
  <!-- heh -->
  <style>
    .oops { color: red; }
  </style>
  <script type="text/javascript">
    alert(1);
    alert(2);
  </script>


  <label [for]="uid + '-' + i">
    {{ item.label }}
    hello
  </label>
  </div>
</body>
</html>

`;

describe('Parser', () => {
  const ast1 = (new HtmlParser('test.html', html));
  const lml1 = ast1.toLml();
  const ast2 = (new LmlParser('1.lml', lml1));
  const html1 = ast2.toHtml();
  const lml2 = (new HtmlParser('1.html', html1)).toLml();
  const html2 = (new LmlParser('2.lml', lml2)).toHtml();

  it('works with consistent outputs', () => {
    expect(lml1).toBe(lml2, 'LML outputs');
    expect(html1).toBe(html2, 'HTML outputs');
  });
});
