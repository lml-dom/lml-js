
export interface ParseConfig {
  indentation?: string;
  orderAttributes?: boolean | 'angular' | 'natural';
  stopOnErrorCount?: number;
}

/**
 * Creates a new instance of a config object for input parsing
 */
export function defaultParseConfig(): ParseConfig {
  return {
    orderAttributes: false,
    stopOnErrorCount: 20
  };
}

export interface OutputConfig {
  indentation?: string;
  lineWrap?: number;
  minify?: boolean;
  orderAttributes?: boolean | 'angular' | 'natural';
}

/**
 * Creates a new instance of a config object for output processing
 */
export function defaultOutputConfig(): OutputConfig {
  return {
    indentation: '  ',
    lineWrap: 120,
    minify: false,
    orderAttributes: false
  };
}
