import { Output } from '../output';

/**
 * Object output (AST or JSON) base class
 */
export abstract class ObjectOutput<T> extends Output<T> {
  /**
   * Remove unnecessary elements (e.g. empty `children` and `attributes` properties)
   */
  protected sanitize(obj: T): T {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && !value.length) {
        delete obj[key];
      } else if (value && typeof value === 'object' && !Object.keys(obj).length) {
        delete obj[key];
      }
    }
    return obj;
  }
}
