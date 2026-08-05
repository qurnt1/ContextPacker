import { filterTreeForExport, sortTreeChildren } from './treeUtils';

export function generatePlainOutput(projectName, selectedFiles, totalTokens, minifyEnabled, tree, selectedPaths, includeFullTree = false) {
  let output = '';

  output += `[CONTEXTPACKER - PROJET: ${projectName}] | TOKENS CONTENU: ${totalTokens} | SOURCE PRESERVEE: OUI\n\n`;

  output += `[STRUCTURE]\n`;
  const filteredTree = filterTreeForExport(tree, selectedPaths, includeFullTree);
  if (filteredTree) {
    output += generateTreeText(filteredTree, '', true, true);
  }
  output += '\n';

  const sortedFiles = [...selectedFiles].sort((a, b) => b.size - a.size);

  sortedFiles.forEach((file) => {
    const content = minifyEnabled ? file.minifiedContent : file.content;
    const tokens = minifyEnabled ? file.minifiedTokens : file.tokens;
    const lines = content.split('\n').length;
    output += `${'─'.repeat(60)}\n`;
    output += `[FILE: ${file.path}] | [LINES: ${lines}] | [TOKENS: ${tokens}]\n`;
    output += `${'─'.repeat(60)}\n`;
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
