
export interface Config {
  indentation?: string;
  minify?: boolean;
}

export const defaultConfig: Config = {
  indentation: '  ',
  minify: false
};
