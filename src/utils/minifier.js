const C_STYLE = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.less', '.java', '.c', '.cpp', '.h', '.hpp', '.go', '.rs', '.swift', '.kt', '.cs', '.php', '.dart'];
const HASH_STYLE = ['.py', '.rb', '.sh', '.bash', '.yml', '.yaml', '.toml', '.r', '.pl', '.pm'];
const HTML_STYLE = ['.html', '.htm', '.xml', '.svg', '.vue', '.svelte'];

export function minifyCode(code, extension) {
  if (!code) return code;
  let result = code;

  // Remove multi-line comments (C-style)
  if (C_STYLE.includes(extension)) {
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/\/\/.*$/gm, '');
  }

  // Remove # comments (Python, Ruby, Shell, YAML, etc.)
  if (HASH_STYLE.includes(extension)) {
    result = result.replace(/^(\s*)#(?!!).*/gm, '');
  }

  // Remove HTML comments
  if (HTML_STYLE.includes(extension)) {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }

  // Remove blank lines
  result = result.replace(/^\s*[\r\n]/gm, '');

  // Remove trailing whitespace
  result = result.replace(/[ \t]+$/gm, '');

  return result.trim();
}
