
const SPACE_RX = / /g;
const TAB_OR_SPACE_RX = /[ \t]/g;
const TAB_RX = /\t/g;

/**
 * Determines whether indentation is errorous
 * @argument indentation spaces or tabs to validate
 * @return true for valid
 */
export function validateIndentationConfig(indentation: string): boolean {
  return !indentation.replace(TAB_OR_SPACE_RX, '').length &&
    !indentation.replace((indentation[0] === '\t' ? TAB_RX : SPACE_RX), '').length &&
    (indentation[0] !== '\t' || indentation.length === 1);
}
