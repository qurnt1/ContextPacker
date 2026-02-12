import ignore from 'ignore';
import { DEFAULT_IGNORED_PATTERNS } from '../constants';

export function createIgnoreFilter(gitignoreContent = '') {
  const ig = ignore();

  DEFAULT_IGNORED_PATTERNS.forEach((pattern) => ig.add(pattern));

  if (gitignoreContent.trim()) {
    ig.add(gitignoreContent);
  }

  return ig;
}
