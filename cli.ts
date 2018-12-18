/**
 * LML-related CLI tool
 * Converts from HTML/LML to HTML/JSON/LML
 * Usage:
 * lml path/to/source-file.ext [options]
 * Options:
 *   --from=html|lml
 *   --to=html|lml|json
 *   --indentation=INDENT_SPEC
 *   --line-wrap=N (defaults to 120)
 *   --minify
 *   --no-order-attributes
 *   --out=outfile
 * Note:
 *   --indentation allows for spaces or tab. Defaults to 2 spaces ("  "). You may use "s" or "t" to keep your CLI argument sane
 *   --minify only works with HTML and JSON outputs and is mutually exclusive with --indentation
 */

import { readFile, writeFile } from 'fs';
import * as minimist from 'minimist';

import { defaultConfig } from './src/config';
import { HtmlParser } from './src/html-parser';
import { LmlParser } from './src/lml-parser';
import { ParseError } from './src/parse-error';

/**
 * Print human readable error(s) and stop running.
 */
function error(...errors: (string | Error | ParseError)[]): void {
  errors = errors.filter((err) => !!err);
  if (errors.length) {
    for (const err of errors) {
      console.error(typeof err === 'string' ? err : (String(err)));
    }
    process.exit(1);
  }
}

const convertMethods = {html: 'toHTML', json: 'toJSON', lml: 'toLML'};
const sourceTypes = ['html', 'lml'];

const ARG_START_INDEX = 2;
const args = minimist(process.argv.slice(ARG_START_INDEX));

const url = args._[0];
if (!url) {
  error('file path argument is required');
}
if (args._.length > 1) {
  error('more than 1 source specified: ' + args._.join(', '));
}

if (args.from) {
  const from = String(args.from).toLowerCase();
  if (sourceTypes.indexOf[from] === -1) {
    error('unknown source type (`--from`): ' + args.from);
  }
  args.from = from;
} else {
  const ext = String(url || '').toLowerCase().split('.').pop();
  args.from = ext === 'html' || ext === 'html' ? 'html' : 'lml';
}

if (args.to) {
  const to = String(args.to).toLowerCase();
  if (!convertMethods[to]) {
    error('unknown conversion target (`--to`): ' + args.to);
  }
  args.to = to;
} else {
  const ext = String(args.out || '').toLowerCase().split('.').pop();
  args.to = ['html', 'json', 'lml'].indexOf(ext) > -1 ? ext : (args.from === 'html' ? 'lml' : 'html');
}

args.indentation = !args.minify && (args.indentation == null || args.indentation === true) ? '  ' : args.indentation;
if (args.indentation) {
  args.indentation = args.indentation.toLowerCase()
    .split('\\s').join(' ').split('\\t').join('\t').split('s').join(' ').split('t').join('\t');
  if (args.indentation.replace(/[ \t]/g, '').length || (args.indentation.length > 1 && args.indentation.indexOf('\t') > -1)) {
    error('indentation can only be spaces or one tab');
  }
}
if (args.indentation === '' && args.to === 'lml') {
  error('indentation must be at least one space for LML');
}

if (args.minify) {
  if (args.to === 'lml') {
    error('LML output can not take `--minify`');
  }
  if (args.indentation) {
    error('Can not combine `--minify` and `--indentation`');
  }
  args.indentation = '';
}

// tslint:disable-next-line:no-magic-numbers
args['line-wrap'] = args['line-wrap'] ? Math.min(40, +args['line-wrap']) : defaultConfig.lineWrap;

readFile(url, 'utf8', (readErr, src) => {
  error(readErr);

  const parser = (args.from === 'html' ? new HtmlParser(url, src) : new LmlParser(url, src));
  if (parser.error) {
    error(...parser.errors);
  }

  const out = parser[convertMethods[args.to]]({
    ...defaultConfig,
    indentation: args.indentation,
    lineWrap: args['line-wrap'],
    minify: !!args.minify,
    orderAttributes: args['no-order-attributes'] ? false : 'angular'
  });

  if (args.out) {
    writeFile(args.out, out, (writeErr) => {
      error(writeErr);
    });
  } else if (args.to === 'json') {
    console.log(JSON.stringify(out, null, args.indentation));
  } else {
    console.log(out.trim());
  }
});
