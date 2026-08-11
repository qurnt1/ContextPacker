import { Tiktoken } from 'js-tiktoken/lite';

let encoding = null;
let encodingPromise = null;

async function loadEncoding() {
  try {
    const { default: o200kBase } = await import('js-tiktoken/ranks/o200k_base');
    return new Tiktoken(o200kBase);
  } catch (primaryError) {
    try {
      const { default: cl100kBase } = await import('js-tiktoken/ranks/cl100k_base');
      return new Tiktoken(cl100kBase);
    } catch {
      throw primaryError;
    }
  }
}

export function initEncoding() {
  if (encoding) return Promise.resolve(encoding);
  if (!encodingPromise) {
    encodingPromise = loadEncoding()
      .then((loadedEncoding) => {
        encoding = loadedEncoding;
        return loadedEncoding;
      })
      .catch((error) => {
        encodingPromise = null;
        throw error;
      });
  }
  return encodingPromise;
}

export function countTokens(text) {
  if (!text) return 0;
  if (!encoding) throw new Error('Le tokenizer n’est pas initialisé.');
  return encoding.encode(text).length;
}
