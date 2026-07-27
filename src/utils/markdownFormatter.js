import { generateTreeText } from './outputFormatter';

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

export function generateMarkdownOutput(projectName, selectedFiles, totalTokens, minifyEnabled, tree, selectedPaths) {
  let md = `# ContextPacker — ${projectName}\n\n`;
  md += `> **Tokens** : ${totalTokens.toLocaleString('fr-FR')} | **Minification** : ${minifyEnabled ? 'ON' : 'OFF'} | **Fichiers** : ${selectedFiles.length}\n\n`;

  const filteredTree = filterTree(tree, selectedPaths);
  if (filteredTree) {
    md += '## Structure\n\n```\n';
    md += generateTreeText(filteredTree, '', true, true);
    md += '```\n\n';
  }

  const sortedFiles = [...selectedFiles].sort((a, b) => b.size - a.size);

  sortedFiles.forEach((file) => {
    const content = minifyEnabled ? file.minifiedContent : file.content;
    const tokens = minifyEnabled ? file.minifiedTokens : file.tokens;
    const lines = content.split('\n').length;
    const ext = (file.extension || '').replace(/^\./, '');
    const lang = ext || '';

    // Detect the longest backtick sequence in the content so our fence
    // is always at least one tick longer — prevents premature closing.
    const backtickMatch = content.match(/`{3,}/g);
    const fenceLen = backtickMatch
      ? Math.max(...backtickMatch.map((s) => s.length)) + 1
      : 3;
    const fence = '`'.repeat(Math.max(fenceLen, 3));

    md += `### ${file.path}\n\n`;
    md += `*${lines} lignes • ${tokens.toLocaleString('fr-FR')} tokens*\n\n`;
    md += fence + lang + '\n';
    md += content;
    if (!content.endsWith('\n')) md += '\n';
    md += fence + '\n\n';
  });

  return md;
}
