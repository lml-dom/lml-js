# LML
Light Meta Language - an HTML alternative

## Concept
- Indentation-based hierarchy - obvious hierarchy
- Enforced one-statement-per-line with reasonable multiline attributes option
- No `<`, `>` character, and no closing tag
- Simple directives for text (`;`), comment (`#`), cdata (`$`)
- No templating trickery - as static as HTML
- Maintained attribute string compatibility with HTML
  - It works well with stuff like Angular event handler attributes (e.g. `(click)="x = 'nah'"`) unlike Pug/Jade

## Example
```lml
!DOCTYPE html
html
  head
    title ; My Title
    script type="text/javascript" src="ext.js"
    script type="text/javascript"
      alert('Hello');
    style
      body { color: #333; }
  body
    # A comment
    div id="wrapper"
      ; My Site!
```
Translates to
```html
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
      body { color: #333; }
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
`lml [options] path/to/source/file.ext`

#### Options
  `--from=TYPE`               available: `ast`, `html`, `json`, `lml`
  `--to=TYPE`                 available: `ast`, `html`, `json`, `lml`
  `--indentation=SPEC`        spaces or tab - use `s` or `t` (default: `ss`)
  `--input-indentation=SPEC`  forced indentation parsing for LML input (default: automatic recoginition)
  `--line-wrap=N`             attempt to keep output line length less than this value (default: 120)
  `--minify`                  minimizing whitepsace in HTML, JSON, and AST outputs
  `--no-order-attributes`     keep original attribute order
  `--out=FILE`                save to file (default: output to console)

## Programmatical use
### Install for your project
`npm install lml --save`
### Parsers produce AST and convert

#### JavaScript example
```javascript
// convert HTML to LML
const parseHTML = require('lml').parseHTML;

parseHTML(htmlString).toLML());
}
```

#### TypeScript example
```typescript
// convert LML to HTML
import { parseLML } from 'lml';

parseLML(lmlString).toHTML();
}
```

#### Parsers
Parser functions are exposed with the same signiture, and the returned object has the same interface:
`parseAST(url: string, source: string | ASTModel[], parseConfig?: ParseConfig) => IParser`
`parseHTML(url: string, source: string, parseConfig?: ParseConfig) => IParser`
`parseJSON(url: string, source: string | JSONModel[], parseConfig?: ParseConfig) => IParser`
`parseLML(url: string, source: string, parseConfig?: ParseConfig) => IParser`

Parser interface:
```typescript
interface IParser {
  errors: ParseError[];
  toAST(config?: OutputConfig): ASTModel[];
  toHTML(config?: OutputConfig): string;
  toJSON(config?: OutputConfig): JSONModel[];
  toLML(config?: OutputConfig): string;
}
```

#### Configurations
```typescript
interface ParseConfig {
  indentation?: string; // for parsing LML, if autodetection is not adequate
  url?: string; // path to source file
}

interface OutputConfig {
  indentation?: string;
  lineWrap?: number;
  minify?: boolean;
  orderAttributes?: 'ascii' | 'natural' | 'angular'; // angular order means: <tag *ngXxx="x" any="x" [other]="x" prop="x" [(banana)]="box" (event)="e()" (handler)="e()" >
}
```

#### AST Model
AST model is used by a variety of DOM parsers, like https://astexplorer.net/
```typescript
interface ASTModel {
  type: 'cdata' | 'comment' | 'directive' | 'script' | 'style' | 'tag' | 'text';
  name?: string; // element (e.g. tag) name
  data?: string; // value of comment, directive, and text
  attribs?: {[name: string]: string};
  children?: ASTModel[];
  startIndex?: number;
  endIndex?: number;
}
```

#### JSON Model
The native structure used by these libraries
```typescript
interface JSONModel {
  type: 'cdata' | 'comment' | 'directive' | 'element' | 'text';
  name?: string; // element name
  data?: string; // value of comment, directive, and text
  attributes?: {name: string; value?: string}[];
  children?: JSONModel[];
}
```
