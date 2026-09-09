import { diffLines } from 'diff';
import { isSelectableFile } from './filePolicy';

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
    .filter(isSelectableFile)
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

function comparePaths(left, right) {
  return left.localeCompare(right, 'fr', { numeric: true, sensitivity: 'base' });
}

function getDirectoryPaths(filePath) {
  const segments = String(filePath || '').split('/').filter(Boolean);
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
}

function isWithinDirectory(filePath, directoryPath) {
  return filePath.startsWith(`${directoryPath}/`);
}

function getCompleteDirectoryGroups(changes, previousByPath, currentByPath) {
  const changeByPath = new Map(changes.map((change) => [change.path, change]));
  const candidates = new Set(changes.flatMap((change) => getDirectoryPaths(change.path)));
  const groups = [];

  candidates.forEach((directoryPath) => {
    for (const kind of ['added', 'removed']) {
      const sourceFiles = kind === 'removed' ? previousByPath : currentByPath;
      const oppositeFiles = kind === 'removed' ? currentByPath : previousByPath;
      const sourcePaths = [...sourceFiles.keys()]
        .filter((path) => isWithinDirectory(path, directoryPath))
        .filter((path) => isSelectableFile(sourceFiles.get(path)));
      const oppositePaths = [...oppositeFiles.keys()]
        .filter((path) => isWithinDirectory(path, directoryPath))
        .filter((path) => isSelectableFile(oppositeFiles.get(path)));

      if (sourcePaths.length < 2 || oppositePaths.length > 0) continue;
      if (!sourcePaths.every((path) => changeByPath.get(path)?.kind === kind)) continue;

      groups.push({
        path: directoryPath,
        kind,
        paths: sourcePaths,
      });
    }
  });

  groups.sort((left, right) => (
    left.path.split('/').length - right.path.split('/').length || comparePaths(left.path, right.path)
  ));

  const selectedGroups = [];
  groups.forEach((group) => {
    if (selectedGroups.some((selected) => isWithinDirectory(group.path, selected.path))) return;
    selectedGroups.push(group);
  });
  return selectedGroups;
}

function aggregateChanges(path, kind, changes, type) {
  const sortedChanges = [...changes].sort((left, right) => comparePaths(left.path, right.path));
  return {
    type,
    path,
    kind,
    fileCount: sortedChanges.length,
    addedLines: sortedChanges.reduce((total, change) => total + change.addedLines, 0),
    removedLines: sortedChanges.reduce((total, change) => total + change.removedLines, 0),
    changedLines: sortedChanges.reduce((total, change) => total + change.changedLines, 0),
    changes: sortedChanges,
  };
}

function createChangeGroups(changes, previousByPath, currentByPath) {
  const completeGroups = getCompleteDirectoryGroups(changes, previousByPath, currentByPath);
  const changeByPath = new Map(changes.map((change) => [change.path, change]));
  const groupedPaths = new Set(completeGroups.flatMap((group) => group.paths));
  const groups = completeGroups.map((group) => aggregateChanges(
    group.path,
    group.kind,
    group.paths.map((path) => changeByPath.get(path)),
    'directory'
  ));

  changes
    .filter((change) => !groupedPaths.has(change.path))
    .forEach((change) => groups.push(aggregateChanges(change.path, change.kind, [change], 'file')));

  return groups.sort((left, right) => comparePaths(left.path, right.path));
}

/**
 * Build a local, in-memory summary of a successful refresh.
 * Non-selectable files never contribute to this view.
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

    // Keep the refresh summary aligned with the exportable file set.
    if ((previous && !isSelectableFile(previous)) || (current && !isSelectableFile(current))) continue;

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
    changeGroups: createChangeGroups(changes, previousByPath, currentByPath),
  };
}
