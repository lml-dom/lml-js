import { ASTModel } from './ast-model';
import { JSONModel } from './json-model';
import { OutputConfig } from './output-config.d';
import { ParseError } from './parser/parse-error';

export interface IParser {
  errors: ParseError[];
  toAST(config?: OutputConfig): ASTModel[];
  toHTML(config?: OutputConfig): string;
  toJSON(config?: OutputConfig): JSONModel[];
  toLML(config?: OutputConfig): string;
}
