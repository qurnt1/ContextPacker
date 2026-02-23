import ignore from 'ignore';
import { DEFAULT_IGNORED_PATTERNS } from '../constants';

export function createIgnoreFilter(gitignoreContent = '', options = {}) {
  const {
    enabled = true,
    includeDefaults = true,
  } = options;

  if (!enabled) {
    return {
      ignores: () => false,
    };
  }

  const ig = ignore();

  if (includeDefaults) {
    DEFAULT_IGNORED_PATTERNS.forEach((pattern) => ig.add(pattern));
  }

  if (gitignoreContent.trim()) {
    ig.add(gitignoreContent);
  }

  return ig;
}
