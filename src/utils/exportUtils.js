import { countTokens } from './tokenCounter';

export function createExportResult(output) {
  return { output, tokenCount: countTokens(output) };
}
