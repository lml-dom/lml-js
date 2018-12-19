
export interface JsonNode {
  endIndex?: number;
  startIndex?: number;
  type: 'cdata' | 'comment' | 'directive' | 'element' | 'text';
}

export interface JsonCdata extends JsonNode {
  type: 'cdata';
  children: JsonText[];
}

export interface JsonComment extends JsonNode {
  type: 'comment';
  data: string;
}

export interface JsonDirective extends JsonNode {
  type: 'directive';
  data: string;
}

export interface JsonElement extends JsonNode {
  type: 'element';
  name: string;
  attributes: {name: string; value?: string}[];
  children: JsonNode[];
}

export interface JsonText extends JsonNode {
  type: 'text';
  data: string;
}
