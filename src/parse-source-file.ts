export const INDENTATION_REGEX = /\s*/;

const _CR_OR_CRLF_REGEXP = /\r\n?/g;

/**
 * Source file data
 * Resembles the @angular/compiler `ParseSourceFile` class with additional position seeking methods
 * {@link https://github.com/angular/angular/blob/cf0968f98e844043a0f6c2548201f3c0dfd329a7/packages/compiler/src/parse_util.ts}
 */
export class ParseSourceFile {
  /**
   * Line offsets cache. Stores offset index for each line in `.content`
   */
  public readonly lineOffsets: number[] = [];

  /**
   * Content in an array of lines
   */
  public readonly lines: string[];

  /**
   * Indentation for the entire block. Will be disregarded in hierarchy.
   */
  public blockIndentation: number;

  /**
   * Initialize source file. Will cache line offsets.
   */
  constructor(public readonly content: string, public readonly url: string) {
    this.content = content.replace(_CR_OR_CRLF_REGEXP, '\n');

    let offset = 0;
    this.lines = this.content.split('\n');
    this.lines.forEach((line) => {
      if (this.blockIndentation !== 0 && line.trim()) {
        const indentation = line.match(INDENTATION_REGEX)[0].length;

        if (this.blockIndentation == null || indentation < this.blockIndentation) {
          this.blockIndentation = indentation;
        }
      }

      this.lineOffsets.push(offset);
      offset += line.length + 1;
    });
  }

  /**
   * Find line/col based on offset index
   */
  public offsetToPos(index: number): [number, number] {
    const offsets = this.lineOffsets;
    const len = this.lineOffsets.length;
    for (let i = 0; i < len; i ++) {
      if (offsets[i + 1] > index) {
        return [i, index - offsets[i]];
      }
    }
    return [len - 1, index - offsets[len - 1]];
  }

  /**
   * Find offset index based on line/col
   */
  public posToOffset(line: number, col: number): number {
    if (typeof line !== 'number' || line % 1 || line < 0) {
      return 0;
    }
    return this.lineOffsets[Math.min(this.lineOffsets.length - 1, line)] + col;
  }
}
