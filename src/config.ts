
export interface Config {
  indentation?: string;
  lineWrap?: number;
  minify?: boolean;
  orderAttributes?: boolean | 'angular' | 'natural';
  stopOnErrorCount?: number;
}

export const defaultConfig: Config = {
  indentation: '  ',
  lineWrap: 120,
  minify: false,
  orderAttributes: false,
  stopOnErrorCount: 20
};
