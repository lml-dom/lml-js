
import { readFile, writeFile } from 'fs';
import * as minimist from 'minimist';

import { AstParser } from './src/ast-parser';
import { defaultOutputConfig, defaultParseConfig } from './src/config';
import { HtmlParser } from './src/html-parser';
import { JsonParser } from './src/json-parser';
import { LmlParser } from './src/lml-parser';
import { ParseError } from './src/parse-error';
import { Parser } from './src/parser';

const LINE_WRAP_MIN = 40;

type ParserClass = typeof AstParser | typeof HtmlParser | typeof JsonParser | typeof LmlParser;
const TYPES: {[type: string]: ParserClass} = {ast: AstParser, html: HtmlParser, json: JsonParser, lml: LmlParser};

/**
 * Print human readable error(s) and stop running.
 */
function error(...errors: (string | Error | ParseError)[]): void {
  errors = errors.filter((err) => !!err);
  if (errors.length) {
    for (const err of errors) {
      console.error('[ERROR]', typeof err === 'string' ? err : (String(err)));
    }
    console.error('Run `lml --help` for all options');
    process.exit(1);
  }
}

const outputConfig = {...defaultOutputConfig()};
const parseConfig = {...defaultParseConfig()};

const ARG_START_INDEX = 2;
const args = minimist(process.argv.slice(ARG_START_INDEX));
if (args['h'] || args['help']) {
  console.log(`
An LML conversion tool between LML, HTML and JSON/AST

Usage:
  lml SOURCE_FILE [options]

Options:
  --from=TYPE               available: ${Object.keys(TYPES).join(', ')}
  --to=TYPE                 available: ${Object.keys(TYPES).join(', ')}
  --indentation=SPEC        spaces or tab - use "s" or "t" (default: "ss")
  --input-indentation=SPEC  forced indentation parsing for LML input (default: automatic recoginition)
  --line-wrap=N             attempt to keep output line length less than this value (default: 120)
  --minify                  minimizing whitepsace in HTML, JSON, and AST outputs
  --no-order-attributes     keep original attribute order
  --out=FILE                save to file (default: output to console)
  `);
  process.exit(0);
}

const url = args._[0];
if (!url) {
  error('Source file argument is required');
}
if (args._.length > 1) {
  error('More than 1 source specified: ' + args._.join(', '));
}

const from = String(args.from || String(url || '').toLowerCase().split('.').pop()).toLowerCase();
const ParserClass: ParserClass = TYPES[from === 'html' ? 'html' : from];
if (!ParserClass) {
  error(`Could not determine input format. Add option: \`lml ... --from=[${Object.keys(TYPES).join('|')}]\``);
}

const to = String(args.to || String(args.out || '').toLowerCase().split('.').pop()).toLowerCase() || (from === 'lml' ? 'html' : 'lml');
if (!TYPES.hasOwnProperty(to)) {
  error(`Unsupported output format: "${to}". Use option: \`lml ... --to=[${Object.keys(TYPES).join('|')}]\``);
}
const outputMethod = 'to' + to.toUpperCase();

if (args.minify) {
  if (to === 'lml') {
    error('LML output can not take `--minify`');
  }
  if (args.indentation) {
    error('Can not combine `--minify` and `--indentation`');
  }
  outputConfig.indentation = '';
  outputConfig.minify = true;
} else if (args.indentation) {
  outputConfig.indentation = args.indentation.toLowerCase().replace(/\\/g, '').replace(/s/g, ' ').replace(/t/g, '\t');
  if (!Parser.validateIndentation(outputConfig.indentation)) {
    error('indentation can only be spaces or one tab');
  }
  if (to === 'lml' && !outputConfig.indentation) {
    error('indentation must be at least one space for LML');
  }
}

if (from === 'lml' && args['input-indentation']) {
  parseConfig.indentation = args['input-indentation'].toLowerCase().replace(/\\/g, '').replace(/s/g, ' ').replace(/t/g, '\t');
  if (!Parser.validateIndentation(parseConfig.indentation)) {
    error('indentation can only be spaces or one tab');
  }
  if (!parseConfig.indentation) {
    error('input indentation must be at least one space or tab for LML');
  }
}

if (args['line-wrap']) {
  outputConfig.lineWrap = Math.min(LINE_WRAP_MIN, +args['line-wrap']);
}

parseConfig.orderAttributes = args['order-attributes'] != null ? args['order-attributes'] : 'angular';

readFile(url, 'utf8', (readErr, src) => {
  error(readErr);

  const parser = new ParserClass(url, src);
  if (parser.error) {
    error(...parser.errors);
  }

  let out = parser[outputMethod](outputConfig);
  if (typeof out === 'object') {
    out = JSON.stringify(out, null, outputConfig.indentation);
  }

  if (args.out) {
    writeFile(args.out, out, (writeErr) => {
      error(writeErr);
    });
  } else {
    console.log(out.trim());
  }
});
