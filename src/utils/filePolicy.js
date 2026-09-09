import { isSensitivePath } from './securityPolicy';

/**
 * Files can be excluded by the scanner when they are too large or otherwise
 * unavailable. Selection and export must use the same rule.
 */
export function isSelectableFile(file) {
  return Boolean(file && !isSensitivePath(file.path) && file.selectable !== false && file.blocked !== true);
}

export const isSelectionAllowed = isSelectableFile;
