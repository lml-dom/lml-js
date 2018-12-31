import { LML_MULTILINE_CONCATENATOR, LML_SIGN, TEXT_BLOCK_ELEMENTS } from './const';
import { DOMNode, DOMNodeType } from './dom-node';
import { InconsistentIndentationCharactersError, InconsistentIndentationError, InvalidMultilineError, InvalidParentError,
  InvalidTagNameError, MisplacedDirectiveError, TooMuchIndentationError } from './parse-error';
import { ParseLocation } from './parse-location';
import { INDENTATION_REGEX } from './parse-source-file';
import { StringParser } from './string-parser';

const PARENT_TYPES = ['cdata', 'element'];
const SPC_AND_TAB_RX = /^[ \t]*/g;
const TAGNAME_RX = /^[a-zA-z][a-zA-Z0-9\:\-]*/;

/**
 * Parses LML string to DOMNode[]
 */
export class LMLParser extends StringParser {
  /**
   * BLock indentation chache
   */
  private blockIndentation: number;

  /**
   * Automatically ID indentation pattern in the source file
   */
  private idIndentation(): string {
    for (const line of this.source.lines) {
      if (line.trim()) {
        const lineIndent = line.substr(this.blockIndentation).match(INDENTATION_REGEX)[0];
        if (lineIndent.length) {
          return lineIndent;
        }
      }
    }
    return '  ';
  }

  protected parse(): void {
    this._levels = [];
    const bi = this.blockIndentation = this.idBlockIndentation();
    const indentation = this.config.indentation = this.config.indentation || this.idIndentation();
    const indentationLen = indentation.length;
    const indent_rx = indentation[0] === '\t' ? /^\t*/ : /^ */;
    const lines = this.source.lines;
    const linesLen = lines.length;
    for (let i = 0; i < linesLen; i++) {
      const line = lines[i];
      if (!line.trim()) {
        continue;
      }
      const indent = line.substr(bi).match(SPC_AND_TAB_RX)[0];
      const spaces = indent.length;
      let level = spaces / indentationLen;
      const lmlSign = line.substr(bi + spaces, 1);
      const type = <DOMNodeType>LML_SIGN[lmlSign] || 'element';

      if (!Number.isInteger(level)) {
        this.errors.push(new InconsistentIndentationError(this.parseSpan(i, bi, i, bi + spaces),
          `Inconsistent indentation step. Should be an increment of ${indentationLen} ${indent[0] === '\t' ? 'tabs' : 'spaces'}`));
        level = Math.ceil(level % indentationLen);
      }
      if (this._last && this._last.level < level - 1) {
        this.errors.push(new TooMuchIndentationError(this.parseSpan(i, bi + this._levels.length * indentationLen, i, bi + spaces)));
        level = this._last.level + 1;
      }
      if (this._last && level > this._last.level && (!PARENT_TYPES.includes(this._last.type) ||
        (this._last.type === 'element' && DOMNode.voidTags.includes(this._last.name)))
      ) {
        if (this.errors[this.errors.length - 1] instanceof InvalidParentError) {
          this.errors[this.errors.length - 1].span.end = new ParseLocation(this.source, null, i, line.length);
        } else {
          this.errors.push(new InvalidParentError(this.parseSpan(i, bi + spaces, i, line.length)));
        }
        continue;
      }

      const node = this.add(type, level, this.parseSpan(i, bi + spaces, i, line.length));

      if (lmlSign === LML_MULTILINE_CONCATENATOR) {
        this.errors.push(new InvalidMultilineError(this.parseSpan(i, bi + spaces, i, bi + spaces + 1)));
        continue;
      }
      if (indent.replace(indent_rx, '').length) {
        this.errors.push(new InconsistentIndentationCharactersError(this.parseSpan(i, bi, i, bi + indent.length)));
      }

      switch (type) {
        case 'cdata': {
          const text = this.add('text', level + 1, this.parseSpan(i, bi + spaces, i, line.length));
          this.textBlockData(text, i, indent, bi, 1, false);
          text.parent = (node.name === 'textarea' && text.data) || text.data.trim() ? text.parent : null;
          break;
        }

        case 'comment':
        case 'text': {
          this.textBlockData(node, i, indent, bi, 1);
          break;
        }

        case 'directive': {
          if (bi || spaces) {
            this.errors.push(new MisplacedDirectiveError(this.parseSpan(i, 0, i, bi + spaces)));
          } else if (this.rootNodes.length > 1) {
            this.errors.push(new MisplacedDirectiveError(this.parseSpan(i, 0, i, line.length)));
          } else {
            node.data = line;
          }
          break;
        }

        case 'element': {
          const parsed = this.parseTag(line.substr(bi + spaces), i, bi + spaces, true);
          node.name = parsed.attrs.shift().name;
          if (!node.name.match(TAGNAME_RX)) {
            this.errors.push(new InvalidTagNameError(this.parseSpan(i, bi + spaces, i, bi + spaces + node.name.length)));
          }
          node.attributes.push(...parsed.attrs);
          const childIndent = indent + indentation;
          const childIndentLen = childIndent.length;
          if (parsed.text) {
            node.sourceSpan.end = new ParseLocation(this.source, parsed.text.sourceSpan.start.offset - 1);
            if (node.name === 'textarea' || parsed.text.data.trim()) {
              parsed.text.parent = node;
            }
          } else {
            let trimmed: string;
            while (lines[i + 1] != null && (!(trimmed = lines[i + 1].trim()) || trimmed.substr(0, 1) === LML_MULTILINE_CONCATENATOR)) {
              i++;
              const pos = lines[i].indexOf(LML_MULTILINE_CONCATENATOR);
              if (pos !== bi + childIndentLen) {
                this.errors.push(new InvalidMultilineError(this.parseSpan(i, 0, i, pos)));
              }
              const {text, attrs} = this.parseTag(trimmed.substr(1), i, pos + 1, true);
              node.sourceSpan.end = new ParseLocation(this.source, null, i, lines[i].length);
              lines[i] = '';
              node.attributes.push(...attrs);
              if (text) {
                node.sourceSpan.end = new ParseLocation(this.source, text.sourceSpan.start.offset - 1);
                if (node.name === 'textarea' || text.data.trim()) {
                  text.parent = node;
                }
                break;
              }
            }
          }
          if (TEXT_BLOCK_ELEMENTS.includes(node.name) && lines[i + 1] != null &&
            (!lines[i + 1].trim() || lines[i + 1].substr(bi, childIndentLen) === childIndent)
          ) {
            const text = this.add('text', level + 1, this.parseSpan(i + 1, bi + childIndentLen, i + 1, lines[i + 1].length));
            this.textBlockData(text, i + 1, childIndent, bi, 0, node.name !== 'textarea', true);
            text.parent = (node.name === 'textarea' && text.data) || text.data.trim() ? text.parent : null;
          }
        }
      }
    }

    this.postProcess();
  }

  /**
   * Fetches data for text block (like cdata, comment, textarea, script, style).
   * Adds upcoming children lines to .data property and empties those lines (so that they don't get parsed as tags later)
   * Also updates sourceSpan (assumes first line was marked)
   * @argument node owner of the block
   * @argument i line number in source
   * @argument indent owner node indentation
   * @argument bi block indentation (the spacing that all lines have in the LML file)
   * @argument skipFirst number of characters to skip (useful to skip block-opening LML signs like ; or $ or #)
   * @argument trim indicates that data is not supposed to be character safe, so we can streamline characters
   * @argument sameLevel indicates that block indentation equals to child indentation (e.g. for textarea/script/style text block)
   */
  private textBlockData(node: DOMNode, i: number, indent: string, bi: number, skipFirst: number, trim = true, sameLevel = false): void {
    const lines = this.source.lines;
    const childIndent = indent + (sameLevel ? '' : this.config.indentation);
    const childIndentLen = childIndent.length;
    node.data = lines[i].substr(bi + indent.length + (skipFirst ? 1 : 0));
    if (trim) {
      node.data = node.data.trim();
    }
    if (sameLevel) {
      lines[i] = '';
    }
    for (i++; lines[i] != null && (!lines[i].trim() || lines[i].substr(bi, childIndentLen) === childIndent); i++) {
      const line = lines[i].substr(bi + childIndentLen);
      node.data += '\n' + (trim ? line.trim() : line);
      node.sourceSpan.end = new ParseLocation(this.source, null, i, lines[i].length);
      lines[i] = '';
    }
    if (trim) {
      node.data = node.data.trim();
    }
  }
}
