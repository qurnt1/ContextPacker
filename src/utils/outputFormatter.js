export function generatePlainOutput(projectName, selectedFiles, totalTokens, minifyEnabled, tree, selectedPaths) {
  let output = '';

  output += `[CONTEXTPACKER - PROJET: ${projectName}]\n`;
  output += `[TOTAL TOKENS: ${totalTokens}] | [MINIFICATION: ${minifyEnabled ? 'ON' : 'OFF'}]\n\n`;

  output += `[STRUCTURE]\n`;
  const filteredTree = filterTree(tree, selectedPaths);
  if (filteredTree) {
    output += generateTreeText(filteredTree, '', true, true);
  }
  output += '\n';

  const sortedFiles = [...selectedFiles].sort((a, b) => b.size - a.size);

  sortedFiles.forEach((file) => {
    const content = minifyEnabled ? file.minifiedContent : file.content;
    const tokens = minifyEnabled ? file.minifiedTokens : file.tokens;
    output += `${'─'.repeat(60)}\n`;
    output += `[CHEMIN: ${file.path}] | [TOKENS: ${tokens}]\n`;
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
    const sorted = [...node.children].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    sorted.forEach((child, i) => {
      const childIsLast = i === sorted.length - 1;
      const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
      result += generateTreeText(child, childPrefix, childIsLast, false);
    });
  }

  return result;
}

function filterTree(node, selectedPaths) {
  if (!node) return null;

  if (node.type === 'file') {
    return selectedPaths.has(node.path) ? { ...node } : null;
  }

  const filteredChildren = (node.children || [])
    .map((child) => filterTree(child, selectedPaths))
    .filter(Boolean);

  if (filteredChildren.length === 0) return null;

  return { ...node, children: filteredChildren };
}
