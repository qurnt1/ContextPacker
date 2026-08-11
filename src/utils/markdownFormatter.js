import { generateCompactTreeText, generateTreeText, getExportFileData } from './outputFormatter';
import { filterTreeForExport } from './treeUtils';

export function generateMarkdownOutput(projectName, selectedFiles, totalTokens, minifyEnabled, tree, selectedPaths, includeFullTree = false, potentialSecretsAllowed = false) {
  let md = minifyEnabled
    ? `# CP: ${projectName}\n\n> ${JSON.stringify({ tokens: totalTokens, source: 'preserved', files: selectedFiles.length })}\n\n`
    : `# ContextPacker — ${projectName}\n\n> **Tokens contenu** : ${totalTokens.toLocaleString('fr-FR')} | **Source préservée** : oui | **Fichiers** : ${selectedFiles.length}\n\n`;

  const filteredTree = filterTreeForExport(tree, selectedPaths, includeFullTree, potentialSecretsAllowed);
  if (filteredTree) {
    md += '## Structure\n\n```\n';
    md += minifyEnabled
      ? generateCompactTreeText(filteredTree)
      : generateTreeText(filteredTree, '', true, true);
    md += '```\n\n';
  }

  const sortedFiles = [...selectedFiles].sort((a, b) => b.size - a.size);

  sortedFiles.forEach((file) => {
    const { content, tokens } = getExportFileData(file, minifyEnabled);
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
    md += minifyEnabled
      ? `*${lines}L · ${tokens.toLocaleString('fr-FR')}t*\n\n`
      : `*${lines} lignes • ${tokens.toLocaleString('fr-FR')} tokens*\n\n`;
    md += fence + lang + '\n';
    md += content;
    if (!content.endsWith('\n')) md += '\n';
    md += fence + '\n\n';
  });

  return md;
}
