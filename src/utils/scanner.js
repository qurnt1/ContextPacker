import { createIgnoreFilter } from './gitignoreParser';
import { isBinaryExtension, isBinaryContent } from './binaryDetector';
import { getExtension } from './helpers';
import { minifyCode } from './minifier';
import { countTokens, initEncoding } from './tokenCounter';
import { MAX_FILE_SIZE } from '../constants';

export async function scanDirectory(dirHandle, onProgress) {
  initEncoding();

  const projectName = dirHandle.name;

  let gitignoreContent = '';
  try {
    const handle = await dirHandle.getFileHandle('.gitignore');
    const file = await handle.getFile();
    gitignoreContent = await file.text();
  } catch {
    // No .gitignore found
  }

  const filter = createIgnoreFilter(gitignoreContent);
  const files = [];
  const tree = { name: projectName, path: '', type: 'directory', children: [] };
  let count = 0;

  async function scan(handle, basePath, parentNode) {
    const entries = [];
    for await (const entry of handle.values()) {
      entries.push(entry);
    }

    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      try {
        if (filter.ignores(entryPath)) continue;
      } catch {
        continue;
      }

      if (entry.kind === 'directory') {
        const dirNode = { name: entry.name, path: entryPath, type: 'directory', children: [] };
        parentNode.children.push(dirNode);
        await scan(entry, entryPath, dirNode);

        if (dirNode.children.length === 0) {
          parentNode.children.pop();
        }
      } else {
        if (isBinaryExtension(entry.name)) continue;

        try {
          const file = await entry.getFile();
          if (file.size > MAX_FILE_SIZE || file.size === 0) continue;

          const content = await file.text();
          if (isBinaryContent(content)) continue;

          const ext = getExtension(entry.name);
          const lines = content.split('\n').length;
          const tokens = countTokens(content);
          const minified = minifyCode(content, ext);
          const minifiedTokens = minified !== content ? countTokens(minified) : tokens;

          files.push({
            name: entry.name,
            path: entryPath,
            extension: ext,
            content,
            minifiedContent: minified,
            size: file.size,
            lines,
            tokens,
            minifiedTokens,
          });

          parentNode.children.push({
            name: entry.name,
            path: entryPath,
            type: 'file',
            extension: ext,
            size: file.size,
            lines,
            tokens,
            minifiedTokens,
          });

          count++;
          if (onProgress) onProgress(count);
        } catch (e) {
          console.warn(`Skipped ${entryPath}:`, e.message);
        }
      }
    }
  }

  await scan(dirHandle, '', tree);

  return { name: projectName, files, tree };
}
