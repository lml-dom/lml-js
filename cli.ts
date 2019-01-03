
import { readFileSync, writeFileSync } from 'fs';
import * as minimist from 'minimist';

import { parseAST, parseHTML, parseJSON, parseLML } from './index';
import { OutputConfig } from './src/output';
import { ParseConfig } from './src/parser';
import { IParser } from './src/parser.d';
import { ParseError } from './src/parser/parse-error';

type Format = 'ast' | 'html' | 'json' | 'lml';

const help = `
An LML conversion tool between LML, HTML and JSON/AST

Usage:
  lml [options] path/to/source/file.ext

Options:
  --from=TYPE               available: {PARSERS}
  --to=TYPE                 available: {OUTPUTS}
  --indentation=SPEC        spaces or tab - use "s" or "t" (default: "ss")
  --input-indentation=SPEC  forced indentation parsing for LML input (default: automatic recoginition)
  --line-wrap=N             attempt to keep output line length less than this value (default: 120)
  --minify                  minimizing whitepsace in HTML, JSON, and AST outputs
  --no-order-attributes     keep original attribute order
  --out=FILE                save to file (default: output to console)
`;

/**
 * CLI request processing logic
 */
class CLI {
  /**
   * Available output methods on parsers
   */
  private readonly outputs = {ast: 'toAST', html: 'toHTML', json: 'toJSON', lml: 'toLML'};

  /**
   * Available parsers
   */
  private readonly parsers = {ast: parseAST, html: parseHTML, json: parseJSON, lml: parseLML};

  /**
   * CLI request processing
   * @argument args command line arguments as parsed by minimist
   */
  constructor(private readonly args: minimist.ParsedArgs) {
    if (this.args['h'] || this.args['help']) {
      this.help();
    }

    let parser: IParser;
    try {
      parser = this.parsers[this.from](this.source, this.parseConfig);
    } catch (err) {
      this.error(err);
    }

    const result = parser[this.outputs[this.to]](this.outputConfig);
    const indentation = this.outputConfig.minify ? '' : this.outputConfig.indentation || '  ';
    const out = typeof result === 'object' ? JSON.stringify(result, null, indentation) : result;

    if (args.out) {
      try {
        writeFileSync(args.out, out);
      } catch (err) {
        this.error(err);
      }
    } else {
      console.log(out.trim());
    }
  }

  /**
   * Returns parser type based on CLI argument or source file extension
   */
  private get from(): Format {
    const ext = String(this.args.from || String(this.url || '').toLowerCase().split('.').pop()).toLowerCase();
    const from = <Format>(ext === 'htm' ? 'html' : ext);
    if (!this.parsers[from]) {
      this.error(`Could not determine input format. Add option: \`lml ... --from=[${Object.keys(this.parsers).join('|')}]\``);
    }
    return from;
  }

  /**
   * Output config overrides from CLI arguments
   */
  private get outputConfig(): OutputConfig {
    const outputConfig: OutputConfig = {};

    if (this.args.minify) {
      if (this.to === 'lml') {
        this.error('LML output can not take `--minify`');
      }
      if (this.args.indentation) {
        this.error('Can not combine `--minify` and `--indentation`');
      }
      outputConfig.indentation = '';
      outputConfig.minify = true;
    } else if (this.args.indentation) {
      outputConfig.indentation = this.args.indentation.toLowerCase().replace(/\\/g, '').replace(/s/g, ' ').replace(/t/g, '\t');
      if (this.to === 'lml' && !outputConfig.indentation) {
        this.error('indentation must be at least one space for LML');
      }
    }

    if (this.args['line-wrap']) {
      outputConfig.lineWrap = +this.args['line-wrap'];
    }

    outputConfig.orderAttributes = this.args['order-attributes'] != null ? this.args['order-attributes'] : 'angular';

    return outputConfig;
  }

  /**
   * Parse config overrides from CLI arguments
   */
  private get parseConfig(): ParseConfig {
    const parseConfig: ParseConfig = {url: this.url};
    if (this.from === 'lml' && this.args['input-indentation']) {
      parseConfig.indentation = this.args['input-indentation'].toLowerCase().replace(/\\/g, '').replace(/s/g, ' ').replace(/t/g, '\t');
      if (!parseConfig.indentation) {
        this.error('input indentation must be at least one space or tab for LML');
      }
    }
    return parseConfig;
  }

  /**
   * Load file source
   */
  private get source(): string {
    try {
      return readFileSync(this.url, 'utf8');
    } catch (err) {
      this.error(err);
    }
  }

  /**
   * Converstion target format
   */
  private get to(): Format {
    const to = <Format>(String(this.args.to || String(this.args.out || '').toLowerCase().split('.').pop()).toLowerCase() ||
      (this.from === 'lml' ? 'html' : 'lml'));
    if (!this.outputs[to]) {
      this.error(`Unsupported output format: "${to}". Use option: \`lml ... --to=[${Object.keys(this.outputs).join('|')}]\``);
    }
    return to;
  }

  /**
   * URL based on file argument
   */
  private get url(): string {
    if (!this.args._[0]) {
      this.error('Source file argument is required');
    } else if (this.args._.length > 1) {
      this.error('More than 1 source specified: ' + this.args._.join(', '));
    }
    return this.args._[0];
  }

  /**
   * Print human readable error(s) and stop running.
   */
  private error(error: string | Error | ParseError): void {
    if (error) {
      console.error('[ERROR]', typeof error === 'string' ? error : (String(error)));
      console.error('Run `lml --help` for help and options');
      process.exit(1);
    }
  }

  /**
   * Print help and exit
   */
  private help(): void {
    console.log(help.replace('{PARSERS}', Object.keys(this.parsers).join(', ')).replace('{OUTPUTS}', Object.keys(this.outputs).join(', ')));
    process.exit(0);
  }
}

// tslint:disable-next-line:no-magic-numbers
new CLI(minimist(process.argv.slice(2)));
