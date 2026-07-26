import { createIgnoreFilter } from './gitignoreParser';
import { isBinaryExtension, isBinaryContent } from './binaryDetector';
import { getExtension } from './helpers';
import { minifyCode } from './minifier';
import { countTokens, initEncoding } from './tokenCounter';
import { MAX_FILE_SIZE } from '../constants';

export async function scanDirectory(dirHandle, onProgress, options = {}) {
  const { applyGitignore = true, onFileStart } = options;
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

  const filter = createIgnoreFilter(gitignoreContent, {
    enabled: applyGitignore,
    includeDefaults: true,
  });
  const files = [];
  const tree = { name: projectName, path: '', type: 'directory', children: [] };
  const candidates = [];

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
      } else {
        if (isBinaryExtension(entry.name)) continue;

        try {
          const file = await entry.getFile();
          if (file.size > MAX_FILE_SIZE || file.size === 0) continue;
          candidates.push({ entry, entryPath, parentNode, file });
        } catch (e) {
          console.warn(`Skipped ${entryPath}:`, e.message);
        }
      }
    }
  }

  await scan(dirHandle, '', tree);

  const total = candidates.length;
  if (onProgress) onProgress(0, total);

  let count = 0;
  for (const candidate of candidates) {
    try {
      if (onFileStart) onFileStart(candidate.entry.name);

      const content = await candidate.file.text();
      if (!content || isBinaryContent(content)) continue;

      const extension = getExtension(candidate.entry.name);
      const lines = content.split('\n').length;
      const tokens = countTokens(content);
      const minified = minifyCode(content, extension);
      const minifiedTokens = minified !== content ? countTokens(minified) : tokens;

      files.push({
        name: candidate.entry.name,
        path: candidate.entryPath,
        extension,
        content,
        minifiedContent: minified,
        size: candidate.file.size,
        lines,
        tokens,
        minifiedTokens,
      });

      candidate.parentNode.children.push({
        name: candidate.entry.name,
        path: candidate.entryPath,
        type: 'file',
        extension,
        size: candidate.file.size,
        lines,
        tokens,
        minifiedTokens,
      });
    } catch (e) {
      console.warn(`Skipped ${candidate.entryPath}:`, e.message);
    } finally {
      count += 1;
      if (onProgress) onProgress(count, total);
    }
  }

  pruneEmptyDirectories(tree);

  return { name: projectName, files, tree };
}

function pruneEmptyDirectories(node) {
  node.children = node.children.filter((child) => {
    if (child.type !== 'directory') return true;
    pruneEmptyDirectories(child);
    return child.children.length > 0;
  });
}
