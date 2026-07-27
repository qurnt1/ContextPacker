/**
 * Safe code minification — whitespace-only.
 *
 * Regex-based comment removal is fundamentally unsafe because it cannot
 * distinguish comments from string literals, regex literals, template
 * strings, or shell directives.  A tokenizer per language would be the
 * correct fix, but that pulls in heavy dependencies for a marginal gain.
 *
 * ponytail: whitespace-only cleaning is acceptable; if comment-stripping
 * becomes a hard requirement, integrate a per-language tokenizer (e.g.
 * tree-sitter WASM modules) rather than adding more regexes here.
 */

// Remove blank lines
const RE_BLANK = /^\s*[\r\n]/gm;

// Remove trailing whitespace
const RE_TRAILING = /[ \t]+$/gm;

export function minifyCode(code, _extension) {
  if (!code) return code;
  let result = code;

  result = result.replace(RE_BLANK, '');
  result = result.replace(RE_TRAILING, '');

  return result.trim();
}
