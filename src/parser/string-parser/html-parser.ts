import { Parser as HtmlParser2 } from 'htmlparser2';

import { DOMNode } from '../../dom-node';
import { HtmlParseError } from '../parse-error';
import { ParseLocation } from '../parse-location';
import { ParseSourceSpan } from '../parse-source-span';
import { StringParser } from '../string-parser';

/**
 * Parses HTML string to DOMNode[]. Depends on the cool `htmlparser2` package
 */
export class HTMLParser extends StringParser {
  /**
   * Open CData ref
   */
  private _cdata: DOMNode;

  /**
   * HtmlParser2 instance
   */
  private _parser: HtmlParser2;

  protected parse(): void {
    this._levels = [];
    this._parser = new HtmlParser2({
      oncdataend: () => { this._cdata = null; },
      oncdatastart: () => { this.onCData(); },
      onclosetag: () => { this.onCloseTag(); },
      oncomment: (data) => { this.onComment(data); },
      onerror: (error) => { this.onError(error); },
      onopentag: (name) => { this.onTag(name); },
      onprocessinginstruction: (name, data) => { this.onDirective(name, data); },
      ontext: (text) => { this.onText(text); }
    }, {recognizeCDATA: true, recognizeSelfClosing: true});
    this._parser.parseComplete(this.source.content);
    this._parser = null;

    this.postProcess();
  }

  /**
   * Source span currently used
   */
  private get currentSpan(): ParseSourceSpan {
    const start = new ParseLocation(this.source, this._parser['startIndex']);
    const end = new ParseLocation(this.source, this._parser['endIndex'] + 1);
    return new ParseSourceSpan(start, end);
  }

  private onCData(): void {
    this._cdata = this.add('cdata', this._parser['_stack'].length, this.currentSpan);
  }

  private onCloseTag(): void {
    const span = this.currentSpan;
    const node = this._levels[this._parser['_stack'].length];
    if (node && node.sourceSpan && node.sourceSpan.start.offset !== span.start.offset) {
      node.closeTagSpan = span;
    }
  }

  private onComment(text: string): void {
    this.add('comment', this._parser['_stack'].length, this.currentSpan, text.split('\n').map((l) => l.trim()).join('\n').trim());
  }

  private onDirective(_name: string, data: string): void {
    const span = this.currentSpan;
    span.end = new ParseLocation(this.source, span.start.offset + data.length + 1 + 1);
    this.add('directive', this._parser['_stack'].length, span, data.trim());
  }

  private onError(error: Error): void {
    throw new HtmlParseError(this.currentSpan, String(error));
  }

  private onTag(_name: string): void {
    const span = this.currentSpan;
    const {attrs} = this.parseTag(new ParseSourceSpan(span.start.off(1), span.end.off(-1)));
    const name = (attrs.shift() || {name: ''}).name;
    if (name) {
      const node = this.add('element', this._parser['_stack'].length - (DOMNode.voidTags.includes(name) ? 0 : 1), span);
      node.name = name;
      node.attributes.push(...attrs);
    }
  }

  private onText(text: string): void {
    const level = this._parser['_stack'].length + (this._cdata ? 1 : 0);
    const span = this.currentSpan;
    if (level === this._lastLevel && this._last.type === 'text') {
      this._last.data += text;
      if (this._last.sourceSpan) {
        this._last.sourceSpan.end = span.end;
      }
    } else {
      this.add('text', level, span, text);
    }
  }
}
