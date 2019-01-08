import { LML_MULTILINE_CONCATENATOR, LML_SIGN, TEXT_BLOCK_ELEMENTS } from '../../const';
import { DOMNode, DOMNodeType } from '../../dom-node';
import { DOMNodeAttribute } from '../../dom-node-attribute';
import { validateIndentationConfig } from '../../validate-indentation-config';
import { InvalidConfigurationError } from '../parse-error';
import { ParseLocation } from '../parse-location';
import { INDENTATION_REGEX } from '../parse-source-file';
import { InconsistentIndentationCharactersWarning, InconsistentIndentationWarning, InvalidMultilineAttributeWarning,
  MisplacedDirectiveWarning, MultilineAttributeIndentationWarning, TooMuchIndentationWarning } from '../parse-warning';
import { StringParser } from '../string-parser';

const INDENT_SAFE_LTRIM_RX = /.*?(?=[ \t]*[^\s])/s;
const RTRIM_RX = /\s+$/;
const SPC_AND_TAB_RX = /^[ \t]*/g;

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
    if (!validateIndentationConfig(indentation)) {
      throw new InvalidConfigurationError('Invalid parsing indentation');
    }

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
        this.errors.push(new InconsistentIndentationWarning(this.parseSpan(i, bi, i, bi + spaces)));
        level = Math.ceil(level % indentationLen);
      }
      if (this._last && this._last.level < level - 1) {
        this.errors.push(new TooMuchIndentationWarning(this.parseSpan(i, bi + this._levels.length * indentationLen, i, bi + spaces)));
        level = this._last.level + 1;
      }
      if (lmlSign === LML_MULTILINE_CONCATENATOR) {
        this.errors.push(new InvalidMultilineAttributeWarning(this.parseSpan(i, bi + spaces, i, bi + spaces + 1)));
        continue;
      }

      const node = this.add(type, level, this.parseSpan(i, bi + spaces, i, line.length));

      if (indent.replace(indent_rx, '').length) {
        this.errors.push(new InconsistentIndentationCharactersWarning(this.parseSpan(i, bi, i, bi + indent.length)));
      }

      switch (type) {
        case 'cdata': {
          this.textBlockData(this.add('text', level + 1, this.parseSpan(i, bi + spaces, i, line.length)), i, indent, bi, 1, false);
          break;
        }

        case 'comment':
        case 'text': {
          this.textBlockData(node, i, indent, bi, 1);
          break;
        }

        case 'directive': {
          if (bi || spaces) {
            this.errors.push(new MisplacedDirectiveWarning(this.parseSpan(i, 0, i, bi + spaces)));
          } else if (this.rootNodes.length > 1) {
            this.errors.push(new MisplacedDirectiveWarning(this.parseSpan(i, 0, i, line.length)));
          } else {
            node.data = line;
          }
          break;
        }

        case 'element': {
          const attributes: DOMNodeAttribute[] = [];
          const text = this.parseTag(this.parseSpan(i, bi + spaces, i, line.length), attributes, true);
          node.name = attributes.shift().name;
          node.attributes.push(...attributes);
          const childIndent = indent + indentation;
          const childIndentLen = childIndent.length;
          if (text) {
            node.sourceSpan.end = text.sourceSpan.start;
            if (node.name === 'textarea' || text.data.trim()) {
              text.parent = node;
            }
          } else {
            let trimmed: string;
            while (lines[i + 1] != null && (!(trimmed = lines[i + 1].trim()) || trimmed.substr(0, 1) === LML_MULTILINE_CONCATENATOR)) {
              i++;
              if (!trimmed) {
                continue;
              }
              const pos = lines[i].indexOf(LML_MULTILINE_CONCATENATOR);
              if (pos !== bi + childIndentLen) {
                this.errors.push(new MultilineAttributeIndentationWarning(this.parseSpan(i, 0, i, pos + 1)));
              }
              const subtext = this.parseTag(this.parseSpan(i, pos + 1, i, lines[i].length), node.attributes, true);
              node.sourceSpan.end = subtext ? subtext.sourceSpan.start : new ParseLocation(this.source, i, lines[i].length);
              lines[i] = '';
              if (subtext) {
                node.sourceSpan.end = new ParseLocation(this.source, subtext.sourceSpan.start.offset - 1);
                if (node.name === 'textarea' || subtext.data.trim()) {
                  subtext.parent = node;
                }
                break;
              }
            }
          }
          if (TEXT_BLOCK_ELEMENTS.includes(node.name) && lines[i + 1] != null &&
            (!lines[i + 1].trim() || lines[i + 1].substr(bi, childIndentLen) === childIndent)
          ) {
            const textBlock = this.add('text', level + 1, this.parseSpan(i + 1, bi + childIndentLen, i + 1, lines[i + 1].length));
            this.textBlockData(textBlock, i + 1, childIndent, bi, 0, node.name !== 'textarea', true);
          }
        }
      }
    }
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
    if (sameLevel) {
      lines[i] = '';
    }
    for (i++; lines[i] != null && (!lines[i].trim() || lines[i].substr(bi, childIndentLen) === childIndent); i++) {
      node.data += '\n' + lines[i].substr(bi + childIndentLen);
      node.sourceSpan.end = new ParseLocation(this.source, i, lines[i].length);
      lines[i] = '';
    }
    if (trim) {
      node.data = sameLevel ? node.data.replace(INDENT_SAFE_LTRIM_RX, '') : node.data.trim();
      const blockLines = node.data.split('\n');
      const bi2 = this.idBlockIndentation(blockLines);
      node.data = blockLines.map((line) => line.substr(bi2).replace(RTRIM_RX, '')).join('\n');
    }
  }
}
