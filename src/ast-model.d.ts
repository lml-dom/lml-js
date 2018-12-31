
export interface ASTModel {
  type: 'cdata' | 'comment' | 'directive' | 'script' | 'style' | 'tag' | 'text';
  name?: string;
  data?: string;
  attribs?: {[name: string]: string};
  children?: ASTModel[];
  startIndex?: number;
  endIndex?: number;
}
