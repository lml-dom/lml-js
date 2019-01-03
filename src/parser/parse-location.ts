import { ParseSourceFile } from './parse-source-file';

/**
 * Source string position
 * *Somewhat* resembles the @angular/compiler `ParseLocation` class
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/parse_util.ts}
 */
export class ParseLocation {
  /**
   * Cached column number (will be used by .col and .offset get/set)
   */
  private _col: number;

  /**
   * Cached line number (will be used by .line and .offset get/set)
   */
  private _line: number;

  constructor(file: ParseSourceFile, offset: number);
  constructor(file: ParseSourceFile, line: number, col: number);
  constructor(file: ParseSourceFile, offset: number, line: number, col: number);
  constructor(public readonly file: ParseSourceFile, offsetOrLine: number, lineOrCol?: number, col?: number) {
    if (col != null) {
      this._line = lineOrCol;
      this._col = col;
    } else if (lineOrCol != null) {
      this._line = offsetOrLine;
      this._col = lineOrCol;
    } else {
      this.offset = offsetOrLine;
    }
  }

  /**
   * Get/set column number
   */
  public get col(): number {
    return this._col;
  }
  public set col(value: number) {
    this._col = value;
  }

  /**
   * Get/set line number
   */
  public get line(): number {
    return this._col;
  }
  public set line(value: number) {
    this._col = value;
  }

  /**
   * Get/set offset (character index in full source)
   */
  public get offset(): number {
    return this.file.lineOffsets[this._line] + this._col;
  }
  public set offset(value: number) {
    const [line, col] = this.file.offsetToPos(value);
    this._line = line;
    this._col = col;
  }

  /**
   * Strings before and after the problem-position
   */
  public getContext(maxChars: number, maxLines: number): {before: string; after: string} {
    const file = this.file;
    const start = Math.max(this.offset - maxChars, file.lineOffsets[Math.max(0, this.line - (maxLines - 1))]);
    const end = Math.min(this.offset + maxChars, file.lineOffsets[Math.min(file.lineOffsets.length - 1, this.line + (maxLines - 1))]);
    return {before: file.content.substring(start, this.offset), after: file.content.substring(this.offset, end + 1)};
  }

  /**
   * Generate new ParseLocation based on offset diff
   * @argument count number of characters to move left (negative) or right (positive)
   */
  public off(count: number): ParseLocation {
    return new ParseLocation(this.file, this.offset + count);
  }

  /**
   * Human-readable position
   */
  public toString(): string {
    return this.file.url + (this.line != null ? `@${this.line}` + (this.col != null ? `:${this.col}` : '') : '');
  }
}
