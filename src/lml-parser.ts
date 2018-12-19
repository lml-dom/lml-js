import { CData } from './ast/cdata';
import { Comment } from './ast/comment';
import { Directive } from './ast/directive';
import { Element } from './ast/element';
import { Node } from './ast/node';
import { CHARACTER_SAFE_ELEMENTS, TEXT_BLOCK_ELEMENTS, Text } from './ast/text';
import { defaultParseConfig } from './config';
import { orderAttributes } from './order-attributes';
import { InconsistentIndentationError, InvalidMultilineError, InvalidParentError, InvalidTagNameError, MisplacedDirectiveError,
  MultilineAttributeIndentationError, TooMuchIndentationError } from './parse-error';
import { ParseLocation } from './parse-location';
import { INDENTATION_REGEX } from './parse-source-file';
import { Parser } from './parser';

const SPC_AND_TAB_RX = /^[ \t]*/g;
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
  constructor(url: string, src: string, config = defaultParseConfig()) {
    super();
    this.preProcess(url, src, config);
    this.parse();
  }

  /**
   * Automatically ID indentation pattern in the source file
   */
  private idIndentation(): void {
    if (!this.config.indentation) {
      // ID indentation pattern
      for (const line of this.source.lines) {
        if (line.trim()) {
          const lineIndent = line.substr(this.source.blockIndentation).match(INDENTATION_REGEX)[0];
          if (lineIndent.length) {
            this.config.indentation = lineIndent;
            break;
          }
        }
      }
      this.config.indentation = this.config.indentation || '  ';
    }
  }

  /**
   * Process input
   */
  private parse(): void {
    const bi = this.source.blockIndentation;
    const lines = this.source.lines;
    const len = lines.length;
    let i: number;
    let line: string;
    let node: Node;
    let spaces: number;
    let trimmed: string;

    this.idIndentation();
    const indentation = this.config.indentation;
    const indentationLen = indentation.length;

    const directiveMultilineBlock = (): void => {
      const expectedTabulation = lines[i].substr(bi, spaces) + indentation;
      while (i < len - 1 && (!lines[i + 1].trim() || lines[i + 1].substr(bi, spaces + indentationLen) === expectedTabulation)) {
        i++;
        if (node.sourceSpan) {
          node.sourceSpan.end = new ParseLocation(this.source, null, i, lines[i].length);
        }
        (<Comment | Text>node).data += '\n' + lines[i].substr(bi + spaces + indentationLen);
      }
    };

    const parseElement = (): void => {
      let parsed = this.parseTag(trimmed, i, spaces, true);
      node = new Element(parsed.attrs.shift().name, parsed.attrs, [], this.parseSpan(i, bi + spaces, i, bi + spaces + trimmed.length));
      if (!(<Element>node).name.match(TAGNAME_RX)) {
        this.errors.push(new InvalidTagNameError(this.parseSpan(i, bi + spaces, i, bi + spaces + (<Element>node).name.length)));
      }

      // multiline attributes
      while (i < len - 1 && (!(trimmed = lines[i + 1].trim()) || trimmed.substr(0, 1) === '\\')) {
        i++;
        if (trimmed) {
          if (lines[i].substr(bi, spaces + indentationLen + 1) !== `${lines[i - 1].substr(bi, spaces)}${indentation}\\`) {
            const pos = lines[i].indexOf('\\');
            this.errors.push(new MultilineAttributeIndentationError(this.parseSpan(i, pos, i, pos + 1)));
          }
          if (node.sourceSpan) {
            node.sourceSpan.end = new ParseLocation(this.source, null, i, bi + spaces + trimmed.length);
          }
          parsed = this.parseTag(trimmed.substr(1), i, bi + spaces + indentationLen + 1, true);
          (<Element>node).attrs.push(...parsed.attrs);
        }
      }
      orderAttributes((<Element>node).attrs, this.config);

      if (parsed.text) {
        parsed.text.parent = <Element>node;
      }

      // script or style block contents
      if (TEXT_BLOCK_ELEMENTS.includes((<Element>node).name)) {
        const startLine = i + 1;
        const contents: string[] = [];
        const expectedTabulation = lines[i].substr(bi, spaces) + indentation;
        while (i < len - 1 && (!lines[i + 1].trim() || lines[i + 1].substr(bi, spaces + indentationLen) === expectedTabulation)) {
          i++;
          contents.push(lines[i].substr(bi + spaces + indentationLen));
        }
        let content = contents.join('\n');
        if (!CHARACTER_SAFE_ELEMENTS.includes((<Element>node).name)) {
          content = content.trim();
        }
        if (content) {
          (new Text(content, this.parseSpan(startLine, 0, i, lines[i].length))).parent = <Element>node;
        }
      }
    };

    const indent_rx = indentation[0] === '\t' ? /^\t*/ : /^ */;
    for (i = 0; i < len; i++) {
      line = lines[i];
      trimmed = line.trim();
      if (trimmed) {
        const lineIndent = line.substr(bi).match(SPC_AND_TAB_RX)[0];
        spaces = lineIndent.length;
        const level = spaces / indentationLen;
        const directive = trimmed.substr(0, 1);
        if (!Number.isInteger(level)) {
          this.errors.push(new InconsistentIndentationError(this.parseSpan(i, bi, i, bi + spaces)));
        } else if (!this._levels[level - 1]) {
          this.errors.push(new TooMuchIndentationError(this.parseSpan(i, this._levels.length * indentationLen, i, spaces)));
        } else if (!this._levels[level - 1]['children']) {
          this.errors.push(new InvalidParentError(this.parseSpan(i, bi + spaces, i, line.length)));
        } else if (directive === '\\') {
          this.errors.push(new InvalidMultilineError(this.parseSpan(i, bi + spaces, i, bi + spaces + 1)));
        } else {
          if (lineIndent.replace(indent_rx, '').length) {
            this.errors.push(new InconsistentIndentationError(this.parseSpan(i, bi, i, bi + lineIndent.length)));
          }

          if (directive === CData.LML_DIRECTIVE) {
            node = new Text(line.substr(bi + spaces + 1), this.parseSpan(i, bi + spaces + 1, i, line.length));
            const cdata = new CData(this.parseSpan(i, bi + spaces, i, line.length), <Text>node);
            directiveMultilineBlock();
            node = cdata;
          } else if (directive === Comment.LML_DIRECTIVE) {
            node = new Comment(trimmed.substr(1), this.parseSpan(i, bi + spaces, i, line.length));
            directiveMultilineBlock();
            (<Comment>node).data = (<Comment>node).data.trim();
          } else if (directive === Directive.LML_DIRECTIVE) {
            if (bi || spaces) {
              this.errors.push(new MisplacedDirectiveError(this.parseSpan(i, 0, i, bi + spaces)));
            } else if (this.rootNodes.length) {
              this.errors.push(new MisplacedDirectiveError(this.parseSpan(i, 0, i, line.length)));
            }
            node = new Directive(trimmed.trim(), this.parseSpan(i, 0, i, line.length));
          } else if (directive === Text.LML_DIRECTIVE) {
            node = new Text(line.substr(bi + spaces + 1), this.parseSpan(i, bi + spaces, i, line.length));
            directiveMultilineBlock();
          } else { // Element
            parseElement();
          }
        }

        if (this.stopParse) {
          break;
        }
        this.add(node, level);
      }
    }
  }
}
