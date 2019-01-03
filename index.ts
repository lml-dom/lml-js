import { ASTModel } from './src/ast-model';
import { JSONModel } from './src/json-model';
import { ParseConfig } from './src/parser-config.d';
import { IParser } from './src/parser.d';
import { ASTParser } from './src/parser/object-parser/ast-parser';
import { JSONParser } from './src/parser/object-parser/json-parser';
import { HTMLParser } from './src/parser/string-parser/html-parser';
import { LMLParser } from './src/parser/string-parser/lml-parser';

export { ASTModel } from './src/ast-model';
export { JSONModel } from './src/json-model';
export { OutputConfig } from './src/output-config.d';
export { ParseConfig } from './src/parser-config.d';
export { ParseError } from './src/parser/parse-error';
export { IParser } from './src/parser.d';

/**
 * Process an AST (JSON) file from source
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseAST(src: string | ASTModel[], config?: ParseConfig): IParser {
  return new ASTParser(src, config);
}

/**
 * Process an HTML file from source
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseHTML(src: string, config?: ParseConfig): IParser {
  return new HTMLParser(src, config);
}

/**
 * Process a JSON file from source
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseJSON(src: string | JSONModel[], config?: ParseConfig): IParser {
  return new JSONParser(src, config);
}

/**
 * Process an LML file from source
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseLML(src: string, config?: ParseConfig): IParser {
  return new LMLParser(src, config);
}
