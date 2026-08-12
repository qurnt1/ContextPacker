import { filterTreeForExport, sortTreeChildren } from './treeUtils';

export function getExportFileData(file, compact) {
  const content = compact ? (file.minifiedContent ?? file.content ?? '') : (file.content ?? '');
  const tokens = compact ? (file.minifiedTokens ?? file.tokens ?? 0) : (file.tokens ?? 0);
  return { content, tokens };
}

export function generatePlainOutput(projectName, selectedFiles, totalTokens, minifyEnabled, tree, selectedPaths, includeFullTree = false, potentialSecretsAllowed = false) {
  let output = '';

  if (minifyEnabled) {
    output += `[CP] ${JSON.stringify({ project: projectName, tokens: totalTokens, files: selectedFiles.length, source: 'preserved' })}\n\n`;
  } else {
    output += `[CONTEXTPACKER - PROJET: ${projectName}] | TOKENS CONTENU: ${totalTokens} | SOURCE PRESERVEE: OUI\n\n`;
  }

  output += minifyEnabled ? '[TREE]\n' : '[STRUCTURE]\n';
  const filteredTree = filterTreeForExport(tree, selectedPaths, includeFullTree, potentialSecretsAllowed);
  if (filteredTree) {
    output += minifyEnabled
      ? generateCompactTreeText(filteredTree)
      : generateTreeText(filteredTree, '', true, true);
  }
  output += '\n';

  const sortedFiles = [...selectedFiles].sort((a, b) => b.size - a.size);

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
    output += content + '\n\n';
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
