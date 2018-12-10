# LML
Light Meta Language - an HTML alternative

## Concept
- Indentation-based hierarchy - obvious hierarchy
- Enforced one-statement-per-line
- No `<`, `>` character and closing tag
- Simple directives for text (`;`), comment (`#`), cdata (`$`)
- No templating trickery - as static as HTML
- Maintained attribute string compatibility with HTML
  - It works well with stuff like Angular event handler attributes (e.g. `(click)="x = 'nah'"`) unlike Pug/Jade

## Example
```
!DOCTYPE html
html
  head
    title
      ; My Title
    script type="text/javascript" src="ext.js"
    script type="text/javascript"
      alert('Hello');
    style
      body {
        background-color: #ddd;
        color: #333;
      }
  body
    # A comment
    div id="wrapper"
      ; My Site!
```
Translates to
```
<!DOCTYPE html>
<html>
  <head>
    <title>
      My Title
    </title>
    <script type="text/javascript" src="ext.js"></script>
    <script type="text/javascript">
      alert('Hello');
    </script>
    <style>
      body {
        background-color: #ddd;
        color: #333;
      }
    </style>
  </head>
  <body>
    <!-- A comment -->
    <div id="wrapper">
      My Site!
    </div>
  </body>
</html>
```

## CLI
### Install globally
`npm install --global lml`
### Usage
Converts HTML/LML to HTML/JSON/LML on the command line
`lml [--from=html|lml] [--to=html|lml|json] [--minify] [--indentation=INDENT_SPEC] [--out=outfile] source.html`
#### Notes
- `--indentation` allows for spaces or tab. Defaults to 2 spaces (`"  "`). You may use `s` or `t` to keep your CLI argument sane
- `--minify` only works with HTML and JSON outputs and is mutually exclusive with `--indentation`

## Programmatical use
### Install for your project
`npm install lml --save`
### Parsers produce AST and convert
Use the `HtmlParser` and `LmlParser` to parse to ast:
JavaScript:
```javascript
// convert HTML to LML
const HtmlParser = require('lml').HtmlParser;

const parser = new HtmlParser(filePath, htmlString);
if (parser.ast.errors.length) {
  console.error.apply(null, ['Parsing failed:'].concat(parser.ast.errors));
} else {
  console.log(parser.ast.toHtml());
}
```

TypeScript:
```typescript
// convert LML to HTML
import { LmlParser } from 'lml';

const parser = new LmlParser(filePath, lmlString);
if (parser.ast.errors.length) {
  console.error('Parsing failed:', ...parser.ast.errors);
} else {
  console.log(parser.ast.toHtml());
}
```
