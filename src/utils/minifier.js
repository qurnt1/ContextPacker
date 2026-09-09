const JSON_FORMAT = 'json';
const CODE_FORMATS = new Set(['js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx']);
const JSON_WHITESPACE = new Set([0x09, 0x0a, 0x0d, 0x20]);
const IDENTIFIER = /[A-Za-z0-9_$]/;
const REGEX_PREFIXES = new Set(['', '=', '(', '[', '{', ',', ':', ';', '!', '?', '&', '|', '+', '-', '*', '%', '^', '~', '<', '>', 'return', 'throw', 'case', 'delete', 'void', 'typeof', 'instanceof', 'in', 'of']);

function normalizeExtension(extension) {
  if (typeof extension !== 'string') return '';
  const normalized = extension.trim().toLowerCase();
  return normalized.startsWith('.') ? normalized.slice(1) : normalized;
}

function fallbackResult(source, format, supported, reason) {
  return { content: source, changed: false, format: format || null, supported, reason };
}

function compactJsonSource(source) {
  let output = '';
  let inString = false;
  let escaped = false;
  for (const character of source) {
    if (inString) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
    } else if (JSON_WHITESPACE.has(character.charCodeAt(0))) {
      continue;
    } else {
      output += character;
      if (character === '"') inString = true;
    }
  }
  return output;
}

function canStartRegex(lastToken) {
  return REGEX_PREFIXES.has(lastToken);
}

function readQuoted(source, start, quote) {
  let index = start + 1;
  let escaped = false;
  while (index < source.length) {
    const character = source[index];
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === quote) return index + 1;
    index += 1;
  }
  return source.length;
}

function readRegex(source, start) {
  let index = start + 1;
  let escaped = false;
  let inClass = false;
  while (index < source.length) {
    const character = source[index];
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === '[') inClass = true;
    else if (character === ']') inClass = false;
    else if (character === '/' && !inClass) {
      index += 1;
      while (/[A-Za-z]/.test(source[index] || '')) index += 1;
      return index;
    }
    index += 1;
  }
  return start;
}

function compactJavaScript(source, isJsx = false) {
  let output = '';
  let index = 0;
  let pendingSpace = false;
  let pendingNewline = false;
  let lastToken = '';
  let jsxText = false;
  let jsxTagOpen = false;
  let jsxClosingTag = false;
  let jsxElementDepth = 0;
  let jsxExpressionDepth = 0;

  const appendToken = (token, nextCharacter) => {
    if (pendingNewline) output += '\n';
    else if (pendingSpace && IDENTIFIER.test(output.at(-1) || '') && IDENTIFIER.test(token[0] || '')) output += ' ';
    output += token;
    pendingSpace = false;
    pendingNewline = false;
    if (IDENTIFIER.test(token.at(-1) || '')) lastToken = token;
    else lastToken = token.at(-1) || lastToken;
    if (nextCharacter === '/' && token === 'return') lastToken = 'return';
  };

  while (index < source.length) {
    const character = source[index];

    if (isJsx && jsxText) {
      if (character === '<') {
        jsxText = false;
      } else if (character === '{') {
        jsxText = false;
        jsxExpressionDepth = 1;
        appendToken(character, source[index + 1]);
        index += 1;
        continue;
      } else {
        output += character;
        index += 1;
        continue;
      }
    }

    if (isJsx && jsxExpressionDepth > 0) {
      if (character === '{') jsxExpressionDepth += 1;
      if (character === '}') {
        jsxExpressionDepth -= 1;
        if (jsxExpressionDepth === 0) jsxText = jsxElementDepth > 0;
      }
    }

    if (isJsx && character === '<' && !jsxTagOpen) {
      const nextCharacter = source[index + 1] || '';
      if (/[A-Za-z/>]/.test(nextCharacter)) {
        jsxTagOpen = true;
        jsxClosingTag = nextCharacter === '/';
      }
    }

    if (/\s/.test(character)) {
      pendingSpace = true;
      if (character === '\n' || character === '\r') pendingNewline = true;
      index += 1;
      continue;
    }

    if (character === '/' && source[index + 1] === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index += 1;
      pendingSpace = true;
      pendingNewline = true;
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      const commentEnd = end === -1 ? source.length : end + 2;
      if (/[\r\n]/.test(source.slice(index, commentEnd))) pendingNewline = true;
      else pendingSpace = true;
      index = commentEnd;
      continue;
    }

    if (/[A-Za-z_$]/.test(character)) {
      let end = index + 1;
      while (/[A-Za-z0-9_$]/.test(source[end] || '')) end += 1;
      appendToken(source.slice(index, end));
      index = end;
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      const end = readQuoted(source, index, character);
      appendToken(source.slice(index, end));
      index = end;
      continue;
    }

    if (character === '/' && canStartRegex(lastToken)) {
      const end = readRegex(source, index);
      if (end !== index) {
        appendToken(source.slice(index, end));
        index = end;
        continue;
      }
    }

    appendToken(character, source[index + 1]);
    if (isJsx && jsxTagOpen && character === '>') {
      const selfClosing = output.at(-2) === '/';
      if (jsxClosingTag) jsxElementDepth = Math.max(0, jsxElementDepth - 1);
      else if (!selfClosing) jsxElementDepth += 1;
      jsxTagOpen = false;
      jsxText = jsxElementDepth > 0;
    }
    index += 1;
  }

  return output.trim();
}

/**
 * Compact formats where the transformation is predictable. Other formats
 * remain byte-for-byte identical instead of risking semantic changes.
 */
export function compactSource(source, extension) {
  const format = normalizeExtension(extension);
  if (typeof source !== 'string') return fallbackResult(source, format, false, 'invalid-source');

  if (format === JSON_FORMAT) {
    const jsonSource = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
    try {
      JSON.parse(jsonSource);
    } catch {
      return fallbackResult(source, format, true, 'invalid-json');
    }
    const content = compactJsonSource(jsonSource);
    return { content, changed: content !== source, format, supported: true, reason: null };
  }

  if (CODE_FORMATS.has(format)) {
    const content = compactJavaScript(source, format === 'jsx' || format === 'tsx');
    return { content, changed: content !== source, format, supported: true, reason: null };
  }

  return fallbackResult(source, format, false, 'unsupported-format');
}

export function minifyCode(source, extension) {
  return compactSource(source, extension).content;
}
