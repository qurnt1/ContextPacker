import ignore from 'ignore';
import { DEFAULT_IGNORED_PATTERNS } from '../constants';
import { SENSITIVE_PATH_PATTERNS } from './securityPolicy';

// These directories are implementation noise and must never enter a context,
// even when a project disables its own .gitignore rules.
const MANDATORY_IGNORED_PATTERNS = [
  ...DEFAULT_IGNORED_PATTERNS,
  ...SENSITIVE_PATH_PATTERNS,
  '.venv',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.hypothesis',
  '.gradle',
  '.nx',
  '.pnpm-store',
  '.eslintcache',
];

export function createIgnoreFilter(gitignoreContent = '', { enabled = true } = {}) {

  const ig = ignore();

  MANDATORY_IGNORED_PATTERNS.forEach((pattern) => ig.add(pattern));

  if (enabled && gitignoreContent.trim()) {
    ig.add(gitignoreContent);
  }

  return ig;
}
