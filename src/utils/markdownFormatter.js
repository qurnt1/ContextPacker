import { generateTreeText } from './outputFormatter';
import { filterTreeForExport } from './treeUtils';

export function generateMarkdownOutput(projectName, selectedFiles, totalTokens, minifyEnabled, tree, selectedPaths, includeFullTree = false) {
  let md = `# ContextPacker — ${projectName}\n\n`;
  md += `> **Tokens contenu** : ${totalTokens.toLocaleString('fr-FR')} | **Source préservée** : oui | **Fichiers** : ${selectedFiles.length}\n\n`;

  const filteredTree = filterTreeForExport(tree, selectedPaths, includeFullTree);
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
