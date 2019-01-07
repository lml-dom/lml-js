// tslint:disable:completed-docs

import { ParseError, ParseErrorLevel } from './parse-error';
import { ParseSourceSpan } from './parse-source-span';

export class ParseWarning extends ParseError {
  constructor(span: ParseSourceSpan, msg: string) {
    super(span, msg, ParseErrorLevel.WARNING);
  }
}

export class AttribsMustBeKeyValueDictionaryWarning extends ParseWarning {
  constructor() {
    super(null, 'Property `attribs` must be a key-value dictionary in AST');
  }
}

export class AttributesMustBeAnArrayWarning extends ParseWarning {
  constructor() {
    super(null, 'Property `attributes` must be an array of attribute objects');
  }
}

export class ChildrenMustBeAnArrayWarning extends ParseWarning {
  constructor() {
    super(null, 'Property `children` must be an array of element objects');
  }
}

export class InconsistentIndentationWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Inconsistent indentation step');
  }
}

export class InconsistentIndentationCharactersWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Inconsistent indentation: a mix of space and tab characters');
  }
}

export class InvalidAttributeNameWarning extends ParseWarning {
  constructor(span?: ParseSourceSpan) {
    super(span, 'Invalid attribute name');
  }
}

export class InvalidAttributeValueWarning extends ParseWarning {
  constructor(span?: ParseSourceSpan) {
    super(span, 'Invalid attribute value');
  }
}

export class InvalidMultilineAttributeWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Multiline is only allowed for HTML element attributes');
  }
}

export class InvalidParentWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Containing element can not have children');
  }
}

export class InvalidQuoteSignWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Invalid quote sign');
  }
}

export class InvalidTagNameWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Invalid tag name');
  }
}

export class InvalidTypeWarning extends ParseWarning {
  constructor(type: string) {
    super(null, 'Invalid type: ' + type);
  }
}

export class MisplacedDirectiveWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Directive can only be the first entry and on the top level');
  }
}

export class MultilineAttributeIndentationWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Multiline concatenation sign (backslash) must be indented by 1 level');
  }
}

export class TooMuchIndentationWarning extends ParseWarning {
  constructor(span: ParseSourceSpan) {
    super(span, 'Too much indentation');
  }
}
