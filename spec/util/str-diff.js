
module.exports = function strDiff(a, b) {
  const len = Math.min(a.length, b.length);

  for (var i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return i;
    } 
  }

  if (a.length !== b.length) {
    return len;
  }

  return -1;
}
