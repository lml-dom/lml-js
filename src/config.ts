
export interface Config {
  indentation?: string;
  minify?: boolean;
  orderAttributes?: boolean | 'angular' | 'natural';
}

export const defaultConfig: Config = {
  indentation: '  ',
  minify: false,
  orderAttributes: false
};
