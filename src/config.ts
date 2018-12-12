
export interface Config {
  indentation?: string;
  minify?: boolean;
  orderAttributes?: boolean | 'angular' | 'natural';
  stopOnErrorCount?: number;
}

export const defaultConfig: Config = {
  indentation: '  ',
  minify: false,
  orderAttributes: false,
  stopOnErrorCount: 20
};
