import { countTokens, initEncoding } from './tokenCounter';

export async function createExportResult(output) {
  await initEncoding();
  return { output, tokenCount: countTokens(output) };
}
