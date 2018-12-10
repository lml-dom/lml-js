import { ParseLocation } from './parse-location';

/**
 * Source span (e.g. start and end {@link ParseLocation ParseLocation} refernces)
 * Resembles the @angular/compiler `ParseSourceSpan` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/parse_util.ts}
 */
export class ParseSourceSpan {
  constructor(public start: ParseLocation, public end: ParseLocation, public details: string = null) {}

  /**
   * String between start (included) and end (excluded) positions
   */
  public toString(): string {
    return this.start.file.content.substring(this.start.offset, this.end.offset);
  }
}
