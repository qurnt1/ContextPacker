import { createIgnoreFilter } from './gitignoreParser';
import { isBinaryExtension, isBinaryContent } from './binaryDetector';
import { getExtension } from './helpers';
import { minifyCode } from './minifier';
import { countTokens, initEncoding } from './tokenCounter';
import { MAX_FILE_SIZE } from '../constants';
import { getSecurityMetadata } from './securityPolicy';

export async function scanDirectory(dirHandle, onProgress, options = {}) {
  const { applyGitignore = true, onFileStart, signal } = options;
  initEncoding();

  throwIfAborted(signal);

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
  const tree = {
    name: projectName,
    path: '',
    type: 'directory',
    children: [],
    selectable: true,
    blocked: false,
    traversed: true,
  };
  const candidates = [];

  async function scan(handle, basePath, parentNode) {
    throwIfAborted(signal);
    const entries = [];
    for await (const entry of handle.values()) {
      entries.push(entry);
    }

    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      throwIfAborted(signal);
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      const security = getSecurityMetadata(entryPath, entry.kind);
      if (entry.kind === 'directory' && security.blocked) {
        parentNode.children.push({
          name: entry.name,
          path: entryPath,
          type: 'directory',
          children: [],
          ...security,
        });
        continue;
      }

      if (entry.kind === 'file' && security.blocked) {
        parentNode.children.push({
          name: entry.name,
          path: entryPath,
          type: 'file',
          size: null,
          ...security,
        });
        continue;
      }

      try {
        if (filter.ignores(entryPath)) continue;
      } catch {
        continue;
      }

      if (entry.kind === 'directory') {
        const dirNode = {
          name: entry.name,
          path: entryPath,
          type: 'directory',
          children: [],
          selectable: true,
          blocked: false,
          traversed: true,
        };
        parentNode.children.push(dirNode);
        await scan(entry, entryPath, dirNode);
      } else {
        if (isBinaryExtension(entry.name)) continue;

        try {
          const file = await entry.getFile();
          if (file.size > MAX_FILE_SIZE) {
            parentNode.children.push({
              name: entry.name,
              path: entryPath,
              type: 'file',
              size: file.size,
              selectable: false,
              blocked: false,
              blockedReason: 'size',
              traversed: false,
            });
            continue;
          }
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
      throwIfAborted(signal);
      if (onFileStart) onFileStart(candidate.entry.name);

      const content = await candidate.file.text();
      if (isBinaryContent(content)) continue;

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
        selectable: true,
        blocked: false,
        blockedReason: null,
        traversed: true,
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
        selectable: true,
        blocked: false,
        blockedReason: null,
        traversed: true,
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
    return child.children.length > 0 || child.blocked || child.selectable === false;
  });
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error('Analyse annulée.');
  error.name = 'AbortError';
  throw error;
}
