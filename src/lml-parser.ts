import { CData } from './ast/cdata';
import { Comment } from './ast/comment';
import { Directive } from './ast/directive';
import { Element } from './ast/element';
import { Node } from './ast/node';
import { Text } from './ast/text';
import { defaultConfig } from './config';
import { ParseLocation } from './parse-location';
import { INDENTATION_REGEX } from './parse-source-file';
import { ParseSourceSpan } from './parse-source-span';
import { Parser } from './parser';

const indentationRxs = {' ': /^ */, '\t': /^\t*/};

/**
 * Parses LML to AST
 */
export class LmlParser extends Parser {
  /**
   * Instantiation triggers parsing
   * @argument url Source file path
   * @argument src LML source string
   * @argument config Optional input parsing configuration
   */
  constructor(url: string, src: string, config = defaultConfig) {
    super(url, src, config);
  }

  protected parse(): void {
    const bi = this.source.blockIndentation;
    const lines = this.source.lines;
    const len = lines.length;

    let indentation: string;
    let indentationLen: number;
    for (let i = 0; i < len; i++) {
      const line = lines[i];
      if (line.trim()) {
        const lineIndent = line.substr(bi).match(INDENTATION_REGEX)[0];
        if (lineIndent.length) {
          if (indentation == null) {
            indentation = lineIndent;
            indentationLen = lineIndent.length;
            if (indentation.replace(/[ \t]/g, '').length || (indentation.length > 1 && indentation.indexOf('\t') > -1)) {
              this.parseError(i, bi, bi + lineIndent.length, `Indentation character mix-up.`);
              return;
            }
            break;
          }
        }
      }
    }
    if (indentation == null) {
      indentation = '  ';
      indentationLen = indentation.length;
    }

    let node: Node;
    const rx = indentationRxs[this.config.indentation[0]];
    for (let i = 0; i < len; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed) {
        const lineIndent = line.substr(bi).match(rx)[0];
        const spaces = lineIndent.length;
        const level = spaces / indentationLen;
        const directive = trimmed.substr(0, 1);
        if (lineIndent.split(indentation).join('')) {
          this.parseError(i, bi, bi + spaces, `Indentation error.`);
          return;
        } else if (!this._levels[level - 1]) {
          this.parseError(i, this._levels.length * indentationLen, spaces, `Too much indentation.`);
        } else if (!this._levels[level - 1]['children']) {
          this.parseError(i, bi + spaces - indentationLen, trimmed.length + indentationLen,
            `Parent element (${this._levels[level - 1]['name'] || 'text'}) can not have children.`);
        } else if (directive === '\\') {
          this.parseError(i, bi + spaces, bi + spaces + 1, `Backslash-multiline is only allowed for HTML elements.`);
        } else if (directive === CData.LML_DIRECTIVE) {
          i = this.directiveMultilineBlock(lines, len, i, spaces, node = new CData(...this.directiveArgs(trimmed, line, i)));
        } else if (directive === Comment.LML_DIRECTIVE) {
          i = this.directiveMultilineBlock(lines, len, i, spaces, node = new Comment(...this.directiveArgs(trimmed, line, i)));
        } else if (directive === Directive.LML_DIRECTIVE) {
          node = new Directive(...this.directiveArgs(trimmed, line, i));
        } else if (directive === Text.LML_DIRECTIVE) {
          i = this.directiveMultilineBlock(lines, len, i, spaces, node = new Text(...this.directiveArgs(trimmed, line, i)));
        } else { // Element
          [node, i] = this.parseElement(trimmed, i, spaces, lines, len, indentation);
        }

        if (this.ast.errors.length) {
          break;
        }
       this.add(node, level);
      }
    }
  }

  private directiveArgs(trimmed: string, line: string, i: number): [string, ParseSourceSpan] {
    const bi = this.source.blockIndentation;
    const value = trimmed.substr(1).trim();
    const left = line.indexOf(value);
    const span = this.parseSpan(i, bi + left, i, bi + left + value.length);
    return [value, span];
  }

  private directiveMultilineBlock(lines: string[], len: number, i: number, spaces: number, node: Comment | CData | Text): number {
    const bi = this.source.blockIndentation;
    if (!this.ast.errors.length) {
      const expectedTabulation = lines[i].substr(bi, spaces) + this.config.indentation;
      const indentationLen = this.config.indentation.length;
      while (i < len - 1 && (!lines[i + 1].trim() || lines[i + 1].substr(bi, spaces + indentationLen) === expectedTabulation)) {
        i++;
        node.data += '\n' + lines[i].substr(bi + spaces + indentationLen);
      }
    }
    return i;
  }

  private parseElement(trimmed: string, i: number, spaces: number, lines: string[], len: number, indentation: string): [Node, number] {
    const bi = this.source.blockIndentation;
    const indentationLen = indentation.length;
    const attrs = this.parseTag(trimmed, i, spaces);
    const node = new Element(attrs.shift().name, attrs, [], this.parseSpan(i, bi + spaces, i, bi + spaces + trimmed.length));
    if ((<Element>node).name[0] === '<') {
      this.parseError(i, bi + spaces, bi + spaces + trimmed.length, 'Invalid LML content.');
    }
    // multiline attributes
    while (i < len - 1 && (!(trimmed = lines[i + 1].trim()) || trimmed.substr(0, 1) === '\\')) {
      i++;
      if (trimmed) {
        if (lines[i].substr(bi, spaces + indentationLen + 1) !== `${lines[i - 1].substr(bi, spaces)}${indentation}\\`) {
          const pos = lines[i].indexOf('\\');
          this.parseError(i, pos, pos + 1, `Multiline character (\\) should be indented by 1 level compared to parent.`);
          break;
        }
        node.sourceSpan.end = new ParseLocation(this.source, null, i, bi + spaces + trimmed.length);
        (<Element>node).attrs.push(...this.parseTag(trimmed.substr(1), i, bi + spaces + indentationLen + 1));
      }
    }

    // script or style block contents
    if (!this.ast.errors.length && (<Element>node).name === 'script' || (<Element>node).name === 'style') {
      const startLine = i + 1;
      let content = '';
      const expectedTabulation = lines[i].substr(bi, spaces) + indentation;
      while (i < len - 1 && (!lines[i + 1].trim() || lines[i + 1].substr(bi, spaces + indentationLen) === expectedTabulation)) {
        i++;
        content += lines[i].substr(bi + spaces + indentationLen) + '\n';
      }
      if (content = content.trim()) {
        const text = new Text(content, this.parseSpan(startLine, 0, i, lines[i].length));
        text.parent = <Element>node;
      }
    }
    return [node, i];
  }
}
