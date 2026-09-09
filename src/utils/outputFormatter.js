import { filterTreeForExport, sortTreeChildren } from './treeUtils';
import { isSelectableFile } from './filePolicy';

export function getExportFileData(file, compact) {
  const content = compact ? (file.minifiedContent ?? file.content ?? '') : (file.content ?? '');
  const tokens = compact ? (file.minifiedTokens ?? file.tokens ?? 0) : (file.tokens ?? 0);
  return { content, tokens };
}

export function getExportSummary(selectedFiles, totalTokens, compact) {
  const sourceFiles = Array.isArray(selectedFiles) ? selectedFiles : [];
  const files = sourceFiles.filter(isSelectableFile);
  const computedTokens = files.reduce(
    (sum, file) => sum + getExportFileData(file, compact).tokens,
    0
  );

  return {
    files,
    totalTokens: files.length === sourceFiles.length && Number.isFinite(totalTokens)
      ? totalTokens
      : computedTokens,
  };
}

export function generatePlainOutput(projectName, selectedFiles, totalTokens, minifyEnabled, tree, selectedPaths, includeFullTree = false) {
  const exportSummary = getExportSummary(selectedFiles, totalTokens, minifyEnabled);
  let output = '';

  if (minifyEnabled) {
    output += `[ContextPacker] ${JSON.stringify({ project: projectName, tokens: exportSummary.totalTokens, files: exportSummary.files.length, source: 'preserved' })}\n`;
  } else {
    output += `[CONTEXTPACKER - PROJET: ${projectName}] | TOKENS CONTENU: ${exportSummary.totalTokens} | SOURCE PRÉSERVÉE: OUI\n\n`;
  }

  output += minifyEnabled ? '[TREE]\n' : '[STRUCTURE]\n';
  const filteredTree = filterTreeForExport(tree, selectedPaths, includeFullTree);
  if (filteredTree) {
    output += minifyEnabled
      ? generateCompactTreeText(filteredTree)
      : generateTreeText(filteredTree, '', true, true);
  }
  if (!minifyEnabled) output += '\n';

  const sortedFiles = [...exportSummary.files].sort((a, b) => b.size - a.size);

  sortedFiles.forEach((file) => {
    const { content, tokens } = getExportFileData(file, minifyEnabled);
    const lines = content.split('\n').length;
    if (minifyEnabled) {
      output += `[F] ${JSON.stringify({ path: file.path, lines, tokens })}\n`;
    } else {
      output += `${'─'.repeat(60)}\n`;
      output += `[FILE: ${file.path}] | [LINES: ${lines}] | [TOKENS: ${tokens}]\n`;
      output += `${'─'.repeat(60)}\n`;
    }
    if (minifyEnabled) {
      output += content;
      if (!content.endsWith('\n')) output += '\n';
    } else {
      output += content + '\n\n';
    }
  });

  return output;
}

export function generateTreeText(node, prefix = '', isLast = true, isRoot = true) {
  let result = '';

  if (!isRoot) {
    const connector = isLast ? '└── ' : '├── ';
    const suffix = node.type === 'directory' ? '/' : '';
    result += prefix + connector + node.name + suffix + '\n';
  }

  if (node.children && node.children.length > 0) {
    const sorted = sortTreeChildren(node.children);

    sorted.forEach((child, i) => {
      const childIsLast = i === sorted.length - 1;
      const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
      result += generateTreeText(child, childPrefix, childIsLast, false);
    });
  }

  return result;
}

export function generateCompactTreeText(node) {
  if (!node) return '';

  const paths = [];
  const visit = (current) => {
    if (current.type === 'directory' && current.path) {
      paths.push(`${current.path}/`);
    } else if (current.type === 'file') {
      paths.push(current.path);
    }

    sortTreeChildren(current.children || []).forEach(visit);
  };

  visit(node);
  return paths.length > 0 ? `${paths.join('\n')}\n` : '';
}
