import { ParseLocation } from './parse-location';
import { ParseSourceFile } from './parse-source-file';

/**
 * Source span (e.g. start and end {@link ParseLocation ParseLocation} refernces)
 * Resembles the @angular/compiler `ParseSourceSpan` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/parse_util.ts}
 */
export class ParseSourceSpan {
  /**
   * End of range (first excluded position)
   */
  public end: ParseLocation;

  /**
   * First included position
   */
  public start: ParseLocation;

  constructor(start: ParseLocation, end: ParseLocation);
  constructor(source: ParseSourceFile, startOffset: number, endOffset: number);
  constructor(startOrSource: ParseLocation | ParseSourceFile, endOrStartOffset: ParseLocation | number, endOffset?: number) {
    if (startOrSource instanceof ParseLocation) {
      this.start = startOrSource;
      this.end = <ParseLocation>endOrStartOffset;
    } else {
      this.start = new ParseLocation(startOrSource, <number>endOrStartOffset);
      this.end = new ParseLocation(startOrSource, <number>endOffset);
    }
  }

  /**
   * Generate new ParseSpan off of start location and char count
   * @argument moveBy leave it to 0 to start at original location
   * @argument length character length of span
   */
  public off(moveBy: number, length: number): ParseSourceSpan {
    const start = this.start.off(moveBy);
    return new ParseSourceSpan(start, start.off(length));
  }

  /**
   * String between start (included) and end (excluded) positions
   */
  public toString(): string {
    return this.start.file.content.substring(this.start.offset, this.end.offset);
  }
}
