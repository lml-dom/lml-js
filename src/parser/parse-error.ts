// tslint:disable:completed-docs

import { ParseSourceSpan } from './parse-source-span';

/**
 * ParseError error level. ERROR indicates a parse-breaking issue
 */
export enum ParseErrorLevel { WARNING, ERROR }

/**
 * Description object for parse errors
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

  constructor(public span?: ParseSourceSpan, public msg = 'error', public level: ParseErrorLevel = ParseErrorLevel.ERROR) {}

  /**
   * String around the problem-position
   */
  public contextualMessage(): string {
    const ctx = this.span && this.span.start.getContext(ParseError.CONTEXT_MAX_CHAR, ParseError.CONTEXT_MAX_LINES);
    return ctx ? `${this.msg} ("${ctx.before}[${ParseErrorLevel[this.level]} ->]${ctx.after}")` : this.msg;
  }

  /**
   * Error/warning context and message in string
   */
  public toString(): string {
    return `${this.contextualMessage()}: ${this.span && this.span.start || ''}`;
  }
}

export class InvalidConfigurationError extends ParseError {
  constructor(msg: string) {
    super(null, msg);
  }
}

export class InvalidSourceError extends ParseError {
  constructor() {
    super(null, 'Missing or invalid source');
  }
}

export class JsonParseError extends ParseError {
  constructor(msg: string) {
    super(null, 'Could not parse JSON.\n' + msg);
  }
}
