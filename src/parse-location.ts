import { ParseSourceFile } from './parse-source-file';

/**
 * Source string position
 * Resembles the @angular/compiler `ParseLocation` class, but intuitively finds missing offset or line/col based on the other info.
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/parse_util.ts}
 */
export class ParseLocation {
  constructor(public file: ParseSourceFile, public offset?: number, public line?: number, public col?: number) {
    if (offset == null && line != null && col != null) {
      this.offset = file.posToOffset(line, col);
    } else if (offset != null && (line == null || col == null)) {
      [this.line, this.col] = file.offsetToPos(offset);
    }
  }

  /**
   * Human-readable position
   */
  public toString(): string {
    return this.file.url + (this.line != null ? `@${this.line}` + (this.col != null ? `:${this.col}` : '') : '');
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
}
