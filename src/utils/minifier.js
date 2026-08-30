/**
 * Compact only syntax that can be parsed and serialized without guessing.
 * Scanners keep the original source separately, so callers can always use
 * it when parsing fails or the format is not supported here.
 */
function compactJsonSource(code) {
  let compact = '';
  let inString = false;
  let escaped = false;

  for (const character of code) {
    if (inString) {
      compact += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (/\s/.test(character)) continue;
    compact += character;
    if (character === '"') inString = true;
  }

  return compact;
}

export function minifyCode(code, extension) {
  if (typeof code !== 'string') return code;

  const normalizedExtension = String(extension || '').toLowerCase().replace(/^\./, '');
  if (normalizedExtension !== 'json') return code;

  try {
    // A UTF-8 BOM is an encoding marker, not JSON content. Browsers expose it
    // in some local files, while JSON.parse rejects it.
    const jsonSource = code.charCodeAt(0) === 0xFEFF ? code.slice(1) : code;
    JSON.parse(jsonSource);
    return compactJsonSource(jsonSource);
  } catch {
    return code;
  }
}
