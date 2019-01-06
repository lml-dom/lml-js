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

## Programmatical use
### Install for your project
`npm install lml --save`
### Parsers produce AST and convert

#### JavaScript example
```javascript
// convert LML to HTML
const parseLML = require('lml').parseLML;

parseLML(lmlString).toHTML();
```

#### Parsers
Parser functions are exposed with the same signiture, and the returned object has the same interface:
`parseAST(source: string | ASTModel[], parseConfig?: ParseConfig) => ParserInterface`
`parseJSON(source: string | JSONModel[], parseConfig?: ParseConfig) => ParserInterface`
`parseLML(source: string, parseConfig?: ParseConfig) => ParserInterface`

##### Parsing HTML
1. install [html-lml](https://github.com/lml-dom/html-lml):
`npm install html-lml --save`
2. use the the indentical parser from that package:
`parseHTML(source: string, parseConfig?: ParseConfig) => ParserInterface`

Parser interface:
```typescript
interface ParserInterface {
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

## CLI
There is a dedicated command line tool: [lml-cli](https://github.com/lml-dom/lml-cli)
