
export interface ParseConfig {
  /**
   * Force LML indentation schema (1 tab or 1+ spaces).
   * By default it will be determined automatically by first indented line.
   */
  indentation?: string;

  /**
   * Add file url/path, so that error other source outputs can include this information
   */
  url?: string;
}
