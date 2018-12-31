import { DOMNodeType } from "./dom-node";

export interface JSONModel {
  type: DOMNodeType;
  name?: string;
  data?: string;
  attributes?: {name: string; value?: string}[];
  children?: JSONModel[];
}
