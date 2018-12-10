import { defaultConfig } from '../config';
import { ParseSourceSpan } from '../parse-source-span';

import { Node } from './node';

/**
 * Representation of the HTML `<![CDATA[]]>` tag
 * This has no @angular/compiler AST class counterpart, but is done much like the {@link Comment Comment class}
 */
export class CData extends Node {
  /**
   * Directive character to identify CDATA
   */
  public static readonly LML_DIRECTIVE = '$';

  /**
   * @argument data Text content
   * @argument sourceSpan Full string source span (including the HTML tag or LML directive character)
   */
  constructor(public data: string, sourceSpan: ParseSourceSpan) {
    super(sourceSpan);
  }

  public toHtml(config = defaultConfig, tabulation = ''): string {
    const data = this.data.trim();
    const lf = config.minify ? '' : '\n';
    const spc = config.minify ? '' : ' ';
    return data ? `${tabulation}<![CDATA[${spc}${this.multilineSanitizer(data, config, tabulation)}${spc}]]>${lf}` : '';
  }

  public toJSON(_config = defaultConfig): Object {
    return this.json({type: 'cdata', data: this.data.trim()});
  }

  public toLml(config = defaultConfig, tabulation = ''): string {
    const data = this.data.trim();
    return data ? `${tabulation}${CData.LML_DIRECTIVE} ${this.multilineSanitizer(data, config, tabulation)}\n` : '';
  }
}
