import { Parser as HtmlParser2 } from 'htmlparser2';

import { CData } from './ast/cdata';
import { Comment } from './ast/comment';
import { Directive } from './ast/directive';
import { Element } from './ast/element';
import { Text } from './ast/text';
import { defaultConfig } from './config';
import { ParseLocation } from './parse-location';
import { ParseSourceSpan } from './parse-source-span';
import { Parser } from './parser';

/**
 * Parses HTML to AST. Depends on the cool `htmlparser2` package
 */
export class HtmlParser extends Parser {
  /**
   * Currently open CDATA tag (if any)
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
  }

  private currentSpan(): ParseSourceSpan {
    const start = new ParseLocation(this.source, this._parser['startIndex']);
    const end = new ParseLocation(this.source, this._parser['endIndex'] + 1);
    return new ParseSourceSpan(start, end);
  }

  private onCData(): void {
    this._cdata = new CData('', this.currentSpan());
    this.add(this._cdata, this._parser['_stack'].length);
  }

  private onComment(text: string): void {
    this.add(new Comment(text, this.currentSpan()), this._parser['_stack'].length);
  }

  private onDirective(_name: string, data: string): void {
    this.add(new Directive(data.substr(1), this.currentSpan()), this._parser['_stack'].length);
  }

  private onError(error: Error): void {
    const span = this.currentSpan();
    this.parseError(span.start.line, span.start.col, span.end.col, String(error));
  }

  private onTag(_name: string): void {
    const span = this.currentSpan();
    const attrs = this.parseTag(this.source.content.substring(span.start.offset + 1, span.end.offset - 1), span.start.line, span.start.col);
    const node = new Element(attrs.shift().name, attrs, [], span);
    this.add(node, this._parser['_stack'].length - (Element.isVoid(node) ? 0 : 1));
  }

  private onText(text): void {
    if (this._cdata) {
      this._cdata.data += text;
    } else {
      const level = this._parser['_stack'].length;
      const span = this.currentSpan();
      if (level === this._lastLevel && this._last instanceof Text) {
        (<Text>this._last).data += text;
        (<Text>this._last).sourceSpan.end = span.end;
      } else {
        this.add(new Text(text, span), level);
      }
    }
  }
}
