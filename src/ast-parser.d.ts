
export interface AstNode {
  endIndex?: number;
  startIndex?: number;
  type: 'cdata' | 'comment' | 'directive' | 'script' | 'style' | 'tag' | 'text';
}

export interface AstCdata extends AstNode {
  type: 'cdata';
  children: AstText[];
}

export interface AstComment extends AstNode {
  type: 'comment';
  data: string;
}

export interface AstDirective extends AstNode {
  type: 'directive';
  data: string;
}

export interface AstTag extends AstNode {
  type: 'script' | 'style' | 'tag';
  name: string;
  attribs: {[name: string]: string};
  children: AstNode[];
}

export interface AstText extends AstNode {
  type: 'text';
  data: string;
}
