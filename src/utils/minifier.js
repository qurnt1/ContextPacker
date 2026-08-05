/**
 * Preserve source exactly until a parser-backed transformation exists.
 * Regexes cannot safely distinguish syntax from string literals or
 * whitespace-significant formats.
 */
export function minifyCode(code, _extension) {
  return code;
}
