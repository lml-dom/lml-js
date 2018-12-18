// tslint:disable:completed-docs

import { ParseSourceSpan } from './parse-source-span';

/**
 * ParseError error level. ERROR indicates a parse-breaking issue
 */
export enum ParseErrorLevel { WARNING, ERROR }

/**
 * Description object for AST parse warnings and errors
 * Resembles the @angular/compiler `ParseError` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/parse_util.ts}
 */
export class ParseError {
  /**
   * The maximum number of characters to be added to the context before and after the problem-position in the source
   */
  public static CONTEXT_MAX_CHAR = 100;

  /**
   * The maximum number of lines to be added to the context before and after the problem-position in the source
   */
  public static CONTEXT_MAX_LINES = 2;

  constructor(public span: ParseSourceSpan, public msg: string, public level: ParseErrorLevel = ParseErrorLevel.ERROR) {}

  /**
   * String around the problem-position
   */
  public contextualMessage(): string {
    const ctx = this.span.start.getContext(ParseError.CONTEXT_MAX_CHAR, ParseError.CONTEXT_MAX_LINES);
    return ctx ? `${this.msg} ("${ctx.before}[${ParseErrorLevel[this.level]} ->]${ctx.after}")` : this.msg;
  }

  /**
   * Error/warning context and message in string
   */
  public toString(): string {
    const details = this.span.details ? `, ${this.span.details}` : '';
    return `${this.contextualMessage()}: ${this.span.start}${details}`;
  }
}

export class HtmlParseError extends ParseError {
  constructor(span: ParseSourceSpan, msg: string) {
    super(span, msg);
  }
}

export class InconsistentIndentationError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Inconsistent indentation: a mix of space and tab characters') {
    super(span, msg);
  }
}

export class InvalidMultilineError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Multiline is only allowed for HTML element attributes') {
    super(span, msg);
  }
}

export class InvalidParentError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Parent element type can not have children') {
    super(span, msg);
  }
}

export class InvalidSourceError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Missing or invalid source') {
    super(span, msg);
  }
}

export class InvalidTagNameError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Invalid tag name') {
    super(span, msg);
  }
}

export class MisplacedDirectiveError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Directive can only be the first entry and on the top level') {
    super(span, msg);
  }
}

export class MissingAttributeNameError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Missing attribute name') {
    super(span, msg);
  }
}

export class MissingAttributeValueError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Missing attribute value') {
    super(span, msg);
  }
}

export class MultilineAttributeIndentationError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Multiline concatenation sign (backslash) must be indented by 1 level') {
    super(span, msg);
  }
}

export class TooMuchIndentationError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Too much indentation') {
    super(span, msg);
  }
}

export class UnclosedQuoteSignError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Unclosed quote sign') {
    super(span, msg);
  }
}

export class UnexpectedQuoteSignError extends ParseError {
  constructor(span: ParseSourceSpan, msg = 'Unexpected quote sign') {
    super(span, msg);
  }
}
