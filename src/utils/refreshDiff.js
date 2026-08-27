import { diffLines } from 'diff';
import { isSelectionAllowed } from './securityPolicy';

const MAX_EDIT_LENGTH = 20_000;

function countLines(content) {
  const normalized = String(content ?? '').replace(/\r\n?/g, '\n');
  if (!normalized) return 0;
  const lines = normalized.split('\n');
  return normalized.endsWith('\n') ? lines.length - 1 : lines.length;
}

function countChangedLines(previousContent, currentContent) {
  try {
    // ponytail: very large diffs fall back to whole-file counts so refreshing
    // remains responsive; raise this cap only if measured project sizes require it.
    const changes = diffLines(previousContent, currentContent, {
      ignoreWhitespace: false,
      maxEditLength: MAX_EDIT_LENGTH,
    });

    if (!changes) {
      return {
        addedLines: countLines(currentContent),
        removedLines: countLines(previousContent),
      };
    }

    return changes.reduce((summary, change) => {
      if (change.added) summary.addedLines += countLines(change.value);
      if (change.removed) summary.removedLines += countLines(change.value);
      return summary;
    }, { addedLines: 0, removedLines: 0 });
  } catch {
    return {
      addedLines: countLines(currentContent),
      removedLines: countLines(previousContent),
    };
  }
}

function indexFiles(files) {
  return new Map(
    (Array.isArray(files) ? files : [])
      .filter((file) => file?.path)
      .map((file) => [file.path, file])
  );
}

function latestModifiedAt(files) {
  const timestamps = (Array.isArray(files) ? files : [])
    .filter(isSelectionAllowed)
    .map((file) => file.lastModified)
    .filter(Number.isFinite);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function createChange(path, kind, previousContent, currentContent) {
  const { addedLines, removedLines } = countChangedLines(previousContent, currentContent);
  return {
    path,
    kind,
    addedLines,
    removedLines,
    changedLines: addedLines + removedLines,
  };
}

/**
 * Build a local, in-memory summary of a successful refresh.
 * Sensitive and non-selectable files never contribute to this view.
 */
export function createRefreshSummary(previousFiles, currentFiles) {
  const previousByPath = indexFiles(previousFiles);
  const currentByPath = indexFiles(currentFiles);
  const allPaths = new Set([...previousByPath.keys(), ...currentByPath.keys()]);
  const changes = [];
  let addedFileCount = 0;
  let removedFileCount = 0;
  let modifiedFileCount = 0;

  for (const path of allPaths) {
    const previous = previousByPath.get(path);
    const current = currentByPath.get(path);

    // Do not reveal a path that is classified as blocked in either snapshot.
    if ((previous && !isSelectionAllowed(previous)) || (current && !isSelectionAllowed(current))) continue;

    if (!previous) {
      addedFileCount += 1;
      changes.push(createChange(path, 'added', '', current.content));
      continue;
    }

    if (!current) {
      removedFileCount += 1;
      changes.push(createChange(path, 'removed', previous.content, ''));
      continue;
    }

    if ((previous.content ?? '') !== (current.content ?? '')) {
      modifiedFileCount += 1;
      changes.push(createChange(path, 'modified', previous.content, current.content));
    }
  }

  changes.sort((left, right) => (
    right.changedLines - left.changedLines || left.path.localeCompare(right.path, 'fr')
  ));

  const totalAddedLines = changes.reduce((total, change) => total + change.addedLines, 0);
  const totalRemovedLines = changes.reduce((total, change) => total + change.removedLines, 0);

  return {
    totalChanged: changes.length,
    addedFileCount,
    removedFileCount,
    modifiedFileCount,
    totalAddedLines,
    totalRemovedLines,
    latestModifiedAt: latestModifiedAt(currentFiles),
    changes,
  };
}
