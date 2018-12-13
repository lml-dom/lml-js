import { CData } from './ast/cdata';
import { Comment } from './ast/comment';
import { Directive } from './ast/directive';
import { Element } from './ast/element';
import { Node } from './ast/node';
import { CHARACTER_SAFE_ELEMENTS, TEXT_BLOCK_ELEMENTS, Text } from './ast/text';
import { defaultConfig } from './config';
import { orderAttributes } from './order-attributes';
import { ParseLocation } from './parse-location';
import { INDENTATION_REGEX } from './parse-source-file';
import { Parser } from './parser';

const SPC_AND_TAB_RX = /[ \t]/g;
const TAGNAME_RX = /^[a-zA-z][a-zA-Z0-9\:\-]*/;

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
    let i: number;
    let line: string;
    let node: Node;
    let spaces: number;
    let trimmed: string;

    // ID indentation pattern
    let indentation: string;
    let indentationLen: number;
    for (i = 0; i < len; i++) {
      line = lines[i];
      if (line.trim()) {
        const lineIndent = line.substr(bi).match(INDENTATION_REGEX)[0];
        if (lineIndent.length) {
          if (indentation == null) {
            indentation = lineIndent;
            indentationLen = lineIndent.length;
            if (indentation.replace(SPC_AND_TAB_RX, '').length || (indentation.length > 1 && indentation.indexOf('\t') > -1)) {
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

    const directiveMultilineBlock = (): void => {
      const expectedTabulation = lines[i].substr(bi, spaces) + this.config.indentation;
      while (i < len - 1 && (!lines[i + 1].trim() || lines[i + 1].substr(bi, spaces + indentationLen) === expectedTabulation)) {
        i++;
        node.sourceSpan.end = new ParseLocation(this.source, null, i, lines[i].length);
        (<Comment | Text>node).data += '\n' + lines[i].substr(bi + spaces + indentationLen);
      }
    };

    const parseElement = (): void => {
      const attrs = this.parseTag(trimmed, i, spaces);
      node = new Element(attrs.shift().name, attrs, [], this.parseSpan(i, bi + spaces, i, bi + spaces + trimmed.length));
      if (!(<Element>node).name.match(TAGNAME_RX)) {
        this.parseError(i, bi + spaces, bi + spaces + (<Element>node).name.length, 'Invalid tag name.');
      }
      // multiline attributes
      while (i < len - 1 && (!(trimmed = lines[i + 1].trim()) || trimmed.substr(0, 1) === '\\')) {
        i++;
        if (trimmed) {
          if (lines[i].substr(bi, spaces + indentationLen + 1) !== `${lines[i - 1].substr(bi, spaces)}${indentation}\\`) {
            const pos = lines[i].indexOf('\\');
            this.parseError(i, pos, pos + 1, `Multiline character (\\) should be indented by 1 level compared to parent.`);
          }
          node.sourceSpan.end = new ParseLocation(this.source, null, i, bi + spaces + trimmed.length);
          (<Element>node).attrs.push(...this.parseTag(trimmed.substr(1), i, bi + spaces + indentationLen + 1));
        }
      }
      orderAttributes((<Element>node).attrs, this.config);

      // script or style block contents
      if (TEXT_BLOCK_ELEMENTS.indexOf((<Element>node).name) > -1) {
        const startLine = i + 1;
        const contents: string[] = [];
        const expectedTabulation = lines[i].substr(bi, spaces) + indentation;
        while (i < len - 1 && (!lines[i + 1].trim() || lines[i + 1].substr(bi, spaces + indentationLen) === expectedTabulation)) {
          i++;
          contents.push(lines[i].substr(bi + spaces + indentationLen));
        }
        let content = contents.join('\n');
        if (CHARACTER_SAFE_ELEMENTS.indexOf((<Element>node).name) === -1) {
          content = content.trim();
        }
        if (content) {
          const text = new Text(content, this.parseSpan(startLine, 0, i, lines[i].length));
          text.parent = <Element>node;
        }
      }
    };

    const indent_rx = this.config.indentation[0] === '\t' ? /^\t*/ : /^ */;
    for (i = 0; i < len; i++) {
      line = lines[i];
      trimmed = line.trim();
      if (trimmed) {
        const lineIndent = line.substr(bi).match(indent_rx)[0];
        spaces = lineIndent.length;
        const level = spaces / indentationLen;
        const directive = trimmed.substr(0, 1);
        if (lineIndent.split(indentation).join('')) {
          this.parseError(i, bi, bi + spaces, `Indentation error.`);
          return;
        } else if (!this._levels[level - 1]) {
          this.parseError(i, this._levels.length * indentationLen, spaces, `Too much indentation.`);
        } else if (!this._levels[level - 1]['children']) {
          const parentName = this._levels[level - 1]['name'];
          this.parseError(i, bi + spaces, line.length, `Parent element${parentName ? ` (${parentName})` : ''} can not have children.`);
        } else if (directive === '\\') {
          this.parseError(i, bi + spaces, bi + spaces + 1, `Backslash-multiline is only allowed for HTML elements.`);
        } else if (directive === CData.LML_DIRECTIVE) {
          node = new Text(line.substr(bi + spaces + 1), this.parseSpan(i, bi + spaces + 1, i, line.length));
          const cdata = new CData(this.parseSpan(i, bi + spaces, i, line.length), <Text>node);
          directiveMultilineBlock();
          node = cdata;
        } else if (directive === Comment.LML_DIRECTIVE) {
          node = new Comment(trimmed.substr(1).trim(), this.parseSpan(i, bi + spaces, i, line.length));
          directiveMultilineBlock();
        } else if (directive === Directive.LML_DIRECTIVE) {
          if (bi || spaces) {
            this.parseError(i, 0, bi + spaces, `Directive can only be top level`);
          }
          if (i) {
            this.parseError(i, 0, line.length, `Directive can only be on the first line`);
          }
          node = new Directive(trimmed.trim(), this.parseSpan(i, 0, i, line.length));
        } else if (directive === Text.LML_DIRECTIVE) {
          node = new Text(line.substr(bi + spaces + 1), this.parseSpan(i, bi + spaces, i, line.length));
          directiveMultilineBlock();
        } else { // Element
          parseElement();
        }

        if (this.stopParse) {
          break;
        }
        this.add(node, level);
      }
    }
  }
}
