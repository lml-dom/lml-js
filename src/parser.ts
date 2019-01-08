import { ASTModel } from './ast-model';
import { DOMNode } from './dom-node';
import { JSONModel } from './json-model';
import { OutputConfig } from './output-config.d';
import { ASTOutput } from './output/object-output/ast-output';
import { JSONOutput } from './output/object-output/json-output';
import { HTMLOutput } from './output/string-output/html-output';
import { LMLOutput } from './output/string-output/lml-output';
import { ParseConfig } from './parser-config.d';
import { ParserInterface } from './parser-interface.d';
import { ParseLocation } from './parser/parse-location';
import { INDENTATION_REGEX, ParseSourceFile } from './parser/parse-source-file';
import { ParseSourceSpan } from './parser/parse-source-span';
import { InvalidParentWarning, InvalidTagNameWarning, ParseWarning } from './parser/parse-warning';

const LINE_END_SPACES_RX = /\s*$/;
const PARENT_TYPES = ['cdata', 'element'];
const TAGNAME_RX = /^[a-zA-z][a-zA-Z0-9\:\-]*/;

/**
 * Parsing base class. Serves HtmlParser and LmlParser
 */
export abstract class Parser implements ParserInterface {
  /**
   * Top level DOM elements
   */
  public readonly rootNodes: DOMNode[] = [];

  /**
   * Non-breaking errors while parsing
   */
  public readonly errors: ParseWarning[] = [];

  /**
   * Parse modifier options
   */
  public config: ParseConfig = {};

  /**
   * Parsing source
   */
  public source: ParseSourceFile;

  /**
   * Convert to AST
   * @argument config output modifiers
   */
  public toAST(config?: OutputConfig): ASTModel[] {
    return (new ASTOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to HTML
   * @argument config output modifiers
   */
  public toHTML(config?: OutputConfig): string {
    return (new HTMLOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to JSON
   * @argument config output modifiers
   */
  public toJSON(config?: OutputConfig): JSONModel[] {
    return (new JSONOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to LML
   * @argument config output modifiers
   */
  public toLML(config?: OutputConfig): string {
    return (new LMLOutput(this.rootNodes, config)).convert();
  }

  /**
   * Convert to LML (alias)
   * @argument config output modifiers
   */
  public toString(config?: OutputConfig): string {
    return this.toLML(config);
  }

  /**
   * Find the number of whitespace characters that occurs on every non-empty line
   * @argument lines source to check. Defaults to source content lines
   * @return number of indentation characters that are found in every non-empty line
   */
  protected idBlockIndentation(lines = this.source.lines): number {
    let blockIndentation: number;
    for (const line of lines) {
      if (blockIndentation !== 0 && line.trim()) {
        const indentation = line.match(INDENTATION_REGEX)[0].length;
        if (blockIndentation == null || indentation < blockIndentation) {
          blockIndentation = indentation;
          if (indentation < 1) {
            return indentation;
          }
        }
      }
    }
    return blockIndentation || 0;
  }

  /**
   * Handle consecutive text nodes as one
   * @argument node parent element
   */
  protected mergeTextChildren(node: DOMNode): void {
    for (let i = node.children.length - 1; i > 0; i--) {
      const child = node.children[i];
      const previous = node.children[i - 1];
      if (child.type === 'text' && previous.type === 'text') {
        if (child.data.trim()) {
          if (previous.data.trim()) {
            previous.data += '\n' + child.data;
          } else {
            previous.data = child.data;
          }
        }
        if (previous.sourceSpan && child.sourceSpan) {
          previous.sourceSpan.end = child.sourceSpan.end;
        }
        node.children.splice(i, 1);
      }
    }
  }

  /**
   * Process input
   */
  protected abstract parse(): void;

  /**
   * Obtain ParseSourceSpan from start line/col and end line/col
   * @argument startLine line # where the span starts
   * @argument startCol col # where the span starts (first included character)
   * @argument endLine line # where the span ends
   * @argument endCol col # where the span ends (first excluded character)
   */
  protected parseSpan(startLine: number, startCol: number, endLine: number, endCol: number): ParseSourceSpan {
    return new ParseSourceSpan(new ParseLocation(this.source, startLine, startCol), new ParseLocation(this.source, endLine, endCol));
  }

  /**
   * Remove unnecessary data recursively
   * @argument nodes child nodes to exemine. Not passing them will trigger processing rootNodes
   */
  protected postProcess(nodes = this.rootNodes): DOMNode[] {
    for (const node of nodes) {
      if (node.parent && (!PARENT_TYPES.includes(node.parent.type) ||
        (node.parent.type === 'element' && DOMNode.voidTags.includes(node.parent.name)))
      ) {
        this.errors.push(new InvalidParentWarning(node.sourceSpan));
      }

      if (node.type === 'element' && !node.name.match(TAGNAME_RX)) {
        this.errors.push(new InvalidTagNameWarning(node.sourceSpan.off(0, node.name.length)));
      }

      if (node.type === 'element' || node.type === 'cdata') {
        this.mergeTextChildren(node);

        const children = node.children;

        if (node.name !== 'textarea' && node.type !== 'cdata') {
          // sanitize text indentations
          for (const child of children) {
            if (child.type === 'text') {
              const lines = child.data.split('\n');
              const bi = this.idBlockIndentation(lines);
              child.data = lines.map((line) => line.substr(bi).replace(LINE_END_SPACES_RX, '')).join('\n').trim();
            }
          }

          // remove empty interconnecting text nodes
          for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            const previous = children[i - 1];
            const next = children[i + 1];
            if (child.type === 'text' && (!previous || previous.type !== 'text') && (!next || next.type !== 'text') &&
            (!child.data || !child.data.trim())) {
              children.splice(i, 1);
            }
          }
        }

        const filteredChildren = this.postProcess(children);
        children.length = 0;
        children.push(...filteredChildren);
      }
    }

    const filtered = nodes.filter((node) => {
      return (node.type !== 'comment' || (node.data && node.data.trim())) &&
        (node.type !== 'text' || (node.parent && node.parent.name === 'textarea') || (node.data && node.data.trim()));
    });

    if (nodes === this.rootNodes) {
      this.rootNodes.length = 0;
      this.rootNodes.push(...filtered);
    }

    return filtered;
  }
}
