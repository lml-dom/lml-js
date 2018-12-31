import { ASTModel } from './src/ast-model';
import { ASTParser } from './src/ast-parser';
import { HTMLParser } from './src/html-parser';
import { JSONModel } from './src/json-model';
import { JSONParser } from './src/json-parser';
import { LMLParser } from './src/lml-parser';
import { ParseConfig } from './src/parser';

/**
 * Process an AST (JSON) file from source
 * @argument url path to file (pass empty string for unknown)
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseAST(url: string, src: string | ASTModel[], config?: ParseConfig): ASTParser {
  return new ASTParser(url, src, config);
}

/**
 * Process an HTML file from source
 * @argument url path to file (pass empty string for unknown)
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseHTML(url: string, src: string, config?: ParseConfig): HTMLParser {
  return new HTMLParser(url, src, config);
}

/**
 * Process a JSON file from source
 * @argument url path to file (pass empty string for unknown)
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseJSON(url: string, src: string | JSONModel[], config?: ParseConfig): JSONParser {
  return new JSONParser(url, src, config);
}

/**
 * Process an LML file from source
 * @argument url path to file (pass empty string for unknown)
 * @argument src source to process
 * @argument config optional processing options
 */
export function parseLML(url: string, src: string, config?: ParseConfig): LMLParser {
  return new LMLParser(url, src, config);
}
