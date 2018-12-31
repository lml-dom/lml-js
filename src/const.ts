
export const LML_CDATA_SIGN = '$';
export const LML_COMMENT_SIGN = '#';
export const LML_DIRECTIVE_SIGN = '!';
export const LML_TEXT_SIGN = ';';

export const LML_SIGN: {[name: string]: string} = {
  '!': 'directive',
  '#': 'comment',
  $: 'cdata',
  ';': 'text'
};
Object.entries(LML_SIGN).forEach(([key, value]) => LML_SIGN[value] = key);

export const LML_MULTILINE_CONCATENATOR = '\\';

export const MIN_AVAILABLE_CHARS_BEFORE_LINE_WRAP = 40;

export const TEXT_BLOCK_ELEMENTS = ['script', 'style', 'textarea'];
