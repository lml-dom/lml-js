// tslint:disable:max-line-length no-magic-numbers object-literal-sort-keys

import { parseJSON } from '../index';
import { Parser } from '../src/parser';

import { exampleJSON } from './lml-output.spec';

const exampleHTML = `<!DOCTYPE html>
<html>
  <head>
    <![CDATA[character data]]>
  </head>
  <body class="abc">
    <!-- example -->
    hello
    <textarea id="first">hello</textarea>
    <script>alert(1);</script>
    <style></style>
    <style>
      /* just making this line way too long to be inline - will be pushed to next line, even though there is no line break */ .hello { color: red; }
    </style>
    <div>one-liner</div>
    <div>
      one line in origin, but too long to be inline - will be pushed to next line, plus be wrapped, well, hopefully :|
    </div>
  </body>
</html>
`;

describe('LML output', () => {
  it('translates properly', () => {
    const parser = <Parser>parseJSON(exampleJSON);
    const html = parser.toHTML();
    expect(html).toBe(exampleHTML);
  });

  it('minification works as expected', () => {
    const parser = <Parser>parseJSON(exampleJSON);
    const html = parser.toHTML({minify: true});
    expect(html).toBe(exampleHTML.replace(/  |\n/g, '').replace(/<!--[^>]*-->/g, ''));
  });
});
