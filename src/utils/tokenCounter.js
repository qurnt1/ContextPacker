import { getEncoding } from 'js-tiktoken';

let encoding = null;

export function initEncoding() {
  if (!encoding) {
    try {
      encoding = getEncoding('o200k_base');
    } catch (e) {
      console.warn('o200k_base unavailable, falling back to cl100k_base:', e);
      encoding = getEncoding('cl100k_base');
    }
  }
  return encoding;
}

export function countTokens(text) {
  if (!text) return 0;
  const enc = initEncoding();
  return enc.encode(text).length;
}
