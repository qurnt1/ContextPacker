import { isSelectionAllowed, isSelectableFile } from './securityPolicy';

export function filterTreeForExport(node, selectedPaths = new Set(), includeFullTree = false, potentialSecretsAllowed = false) {
  if (!node || node.blocked || node.selectable === false) return null;
  if (node.potentialSecrets?.length && !potentialSecretsAllowed) return null;
  if (node.type === 'file') {
    return includeFullTree || selectedPaths.has(node.path) ? { ...node } : null;
  }

  const children = (node.children || [])
    .map((child) => filterTreeForExport(child, selectedPaths, includeFullTree, potentialSecretsAllowed))
    .filter(Boolean);
  if (children.length === 0) return null;
  return { ...node, children };
}

export function getSearchResultPaths(node, query = '') {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const paths = [];

  function collectFiles(current) {
    if (!current) return;
    if (current.type === 'file') {
      if (isSelectableFile(current) || current.blocked) paths.push(current.path);
      return;
    }
    (current.children || []).forEach(collectFiles);
  }

  function visit(current) {
    if (!current) return false;
    const matches = !normalizedQuery || current.name.toLowerCase().includes(normalizedQuery);
    if (matches) {
      collectFiles(current);
      return true;
    }
    if (current.type === 'file') return false;
    return (current.children || []).map(visit).some(Boolean);
  }

  visit(node);
  return [...new Set(paths)];
}

export function buildSelectionIndex(node, selectedPaths = new Set(), potentialSecretsAllowed = false) {
  const index = new Map();

  function visit(current) {
    if (!current) return { selectableCount: 0, selectedCount: 0, paths: [] };
    if (current.type === 'file') {
      const selectableCount = isSelectionAllowed(current, potentialSecretsAllowed) ? 1 : 0;
      const selectedCount = selectableCount && selectedPaths.has(current.path) ? 1 : 0;
      const summary = { selectableCount, selectedCount, paths: selectableCount ? [current.path] : [] };
      index.set(current.path, summary);
      return summary;
    }

    const summary = (current.children || []).reduce((total, child) => {
      const childSummary = visit(child);
      return {
        selectableCount: total.selectableCount + childSummary.selectableCount,
        selectedCount: total.selectedCount + childSummary.selectedCount,
        paths: total.paths.concat(childSummary.paths),
      };
    }, { selectableCount: 0, selectedCount: 0, paths: [] });
    index.set(current.path, summary);
    return summary;
  }

  visit(node);
  return index;
}

export function buildTreeFromFiles(rootName, files, extraNodes = []) {
  const root = {
    name: rootName,
    path: '',
    type: 'directory',
    children: [],
    selectable: true,
    blocked: false,
    traversed: true,
  };
  const directoryIndex = new Map([['', root]]);

  const addPath = (path, factory) => {
    const parts = String(path || '').split('/').filter(Boolean);
    if (parts.length === 0) return;
    const name = parts.pop();
    let currentPath = '';
    let currentNode = root;
    parts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let directory = directoryIndex.get(currentPath);
      if (!directory) {
        directory = {
          name: part,
          path: currentPath,
          type: 'directory',
          children: [],
          selectable: true,
          blocked: false,
          traversed: true,
        };
        currentNode.children.push(directory);
        directoryIndex.set(currentPath, directory);
      }
      currentNode = directory;
    });
    if (!currentNode.children.some((child) => child.path === path)) {
      currentNode.children.push(factory(name, path));
    }
  };

  files.forEach((file) => addPath(file.path, (name, path) => ({
    name,
    path,
    type: 'file',
    extension: file.extension,
    size: file.size,
    lines: file.lines,
    tokens: file.tokens,
    minifiedTokens: file.minifiedTokens,
    selectable: file.selectable !== false,
    blocked: Boolean(file.blocked),
    blockedReason: file.blockedReason || null,
    potentialSecrets: file.potentialSecrets || [],
    traversed: file.traversed !== false,
  })));

  extraNodes.forEach((node) => addPath(node.path, (name, path) => ({
    ...node,
    name: node.name || name,
    path,
    type: node.type || 'file',
    children: node.children || [],
    selectable: false,
    blocked: Boolean(node.blocked),
    traversed: node.traversed === true,
  })));

  return root;
}

export function sortTreeChildren(children = []) {
  return [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
