import { Parser as HtmlParser2 } from 'htmlparser2';

import { CData } from './ast/cdata';
import { Comment } from './ast/comment';
import { Directive } from './ast/directive';
import { Element } from './ast/element';
import { Node } from './ast/node';
import { CHARACTER_SAFE_ELEMENTS, Text } from './ast/text';
import { defaultConfig } from './config';
import { orderAttributes } from './order-attributes';
import { ParseLocation } from './parse-location';
import { ParseSourceFile } from './parse-source-file';
import { ParseSourceSpan } from './parse-source-span';
import { Parser } from './parser';

const LINE_END_SPACES_RX = /\s*$/;

/**
 * Parses HTML to AST. Depends on the cool `htmlparser2` package
 */
export class HtmlParser extends Parser {
  /**
   * Open CData ref
   */
  private _cdata: CData;

  /**
   * HtmlParser2 instance
   */
  private _parser: HtmlParser2;

  /**
   * Instantiation triggers parsing
   * @argument url Source file path
   * @argument src HTML source string
   * @argument config Optional input parsing configuration
   */
  constructor(url: string, src: string, config = defaultConfig) {
    super(url, src, config);
  }

  protected parse(): void {
    this._parser = new HtmlParser2({
      oncdataend: () => { this._cdata = null; },
      oncdatastart: () => { this.onCData(); },
      oncomment: (data) => { this.onComment(data); },
      onerror: (error) => { this.onError(error); },
      onopentag: (name) => { this.onTag(name); },
      onprocessinginstruction: (name, data) => { this.onDirective(name, data); },
      ontext: (text) => { this.onText(text); }
    }, {recognizeCDATA: true, recognizeSelfClosing: true});
    this._parser.parseComplete(this.source.content);
    this._levels.length = 0;
    this._parser = null;

    this.postProcess(this.rootNodes);
  }

  private currentSpan(): ParseSourceSpan {
    const start = new ParseLocation(this.source, this._parser['startIndex']);
    const end = new ParseLocation(this.source, this._parser['endIndex'] + 1);
    return new ParseSourceSpan(start, end);
  }

  private onCData(): void {
    this.add(this._cdata = new CData(this.currentSpan()), this._parser['_stack'].length);
  }

  private onComment(text: string): void {
    this.add(new Comment(text.trim(), this.currentSpan()), this._parser['_stack'].length);
  }

  private onDirective(_name: string, data: string): void {
    this.add(new Directive(data.trim(), this.currentSpan()), this._parser['_stack'].length);
  }

  private onError(error: Error): void {
    const span = this.currentSpan();
    this.parseError(span.start.line, span.start.col, span.end.col, String(error));
  }

  private onTag(_name: string): void {
    const span = this.currentSpan();
    const attrs = this.parseTag(this.source.content.substring(span.start.offset + 1, span.end.offset - 1), span.start.line, span.start.col);
    const node = new Element(attrs.shift().name, orderAttributes(attrs, this.config), [], span);
    this.add(node, this._parser['_stack'].length - (Element.isVoid(node) ? 0 : 1));
  }

  private onText(text): void {
    const level = this._parser['_stack'].length + (this._cdata ? 1 : 0);
    const span = this.currentSpan();
    if (level === this._lastLevel && this._last instanceof Text) {
      (<Text>this._last).data += text;
      (<Text>this._last).sourceSpan.end = span.end;
    } else {
      this.add(new Text(text, span), level);
    }
  }

  private postProcess(nodes: Node[]): void {
    for (const node of nodes) {
      if (node instanceof Element) {
        this.mergeTextChildren(node);

        const children = node.children || [];

        if (CHARACTER_SAFE_ELEMENTS.indexOf(node.name) === -1) {
          // sanitize text indentations
          for (const text of children) {
            if (text instanceof Text) {
              const lines = (text.data || '').split('\n');
              const bi = ParseSourceFile.blockIndentation(lines);
              text.data = lines.map((line) => line.substr(bi).replace(LINE_END_SPACES_RX, '')).join('\n').trim();
            }
          }

          // remove empty interconnecting text nodes
          for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            const previous = children[i - 1];
            const next = children[i + 1];
            if (child instanceof Text && (!(previous instanceof Text) || previous == null) && (!(next instanceof Text) || next == null) &&
            (!child.data || !child.data.trim())) {
              children.splice(i, 1);
            }
          }
        }

        this.postProcess(node.children);
      }
    }
  }
}
