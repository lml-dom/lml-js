
/**
 * Finds the index of first difference between two strings
 */
export function strDiff(a: string, b: string): number {
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return i;
    }
  }

  if (a.length !== b.length) {
    return len;
  }

  return -1;
}
