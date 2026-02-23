import { createIgnoreFilter } from './gitignoreParser';
import { isBinaryExtension, isBinaryContent } from './binaryDetector';
import { getExtension } from './helpers';
import { minifyCode } from './minifier';
import { countTokens, initEncoding } from './tokenCounter';
import { MAX_FILE_SIZE } from '../constants';

const GITHUB_API_BASE = 'https://api.github.com';
const RECENT_REPOS_KEY = 'cp-recent-github-repos';
const RECENT_REPOS_MAX = 8;
const DEFAULT_GITHUB_MAX_FILES = 1200;
const DEFAULT_GITHUB_MAX_TOTAL_BYTES = 8_000_000;
const BYTES_PER_TOKEN_ESTIMATE = 4;
const DOWNLOAD_CONCURRENCY = 6;

const githubScanCache = new Map();

export function parseGitHubRepoInput(input, manualSubPath = '') {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('Entrez une URL GitHub ou un identifiant owner/repo.');
  }

  let owner = '';
  let repo = '';
  let ref = '';
  let parsedSubPath = '';
  let normalizedInput = trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
      throw new Error('Seules les URLs github.com sont supportées.');
    }

    const parts = url.pathname.split('/').filter(Boolean);
    owner = parts[0] || '';
    repo = (parts[1] || '').replace(/\.git$/i, '');

    if (parts[2] === 'tree' && parts[3]) {
      ref = decodeURIComponent(parts[3]);
      if (parts.length > 4) {
        parsedSubPath = decodeURIComponent(parts.slice(4).join('/'));
      }
    }
  } else {
    const noHost = trimmed.replace(/^github\.com\//i, '');
    const hashParts = noHost.split('#');
    const repoPart = hashParts[0];
    ref = hashParts[1] || '';
    const split = repoPart.split('/').filter(Boolean);
    owner = split[0] || '';
    repo = (split[1] || '').replace(/\.git$/i, '');
    normalizedInput = `https://github.com/${owner}/${repo}${ref ? `#${ref}` : ''}`;
  }

  if (!owner || !repo) {
    throw new Error('Format invalide. Exemple: https://github.com/owner/repo');
  }

  const subPath = normalizeSubPath(manualSubPath || parsedSubPath);

  return {
    owner,
    repo,
    ref: ref || '',
    subPath,
    normalizedInput,
  };
}

export async function scanGitHubRepo({
  repoInput,
  token = '',
  applyGitignore = true,
  subPath = '',
  maxFiles = DEFAULT_GITHUB_MAX_FILES,
  maxTotalBytes = DEFAULT_GITHUB_MAX_TOTAL_BYTES,
  onEstimate,
  onProgress,
} = {}) {
  initEncoding();

  const parsed = parseGitHubRepoInput(repoInput, subPath);
  const authToken = String(token || '').trim();

  const repoInfo = await fetchGitHubJson(
    `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}`,
    authToken
  );

  if (repoInfo.private) {
    throw new Error('Les repositories privés ne sont pas supportés dans cette version.');
  }

  const resolvedRef = parsed.ref || repoInfo.default_branch;
  const cacheKey = `${parsed.owner}/${parsed.repo}@${resolvedRef}::${parsed.subPath || ''}::${applyGitignore ? '1' : '0'}`;
  const cached = githubScanCache.get(cacheKey);
  if (cached) {
    if (onProgress) {
      onProgress(cached.files.length, cached.files.length, 'cache');
    }
    return cloneResult(cached);
  }

  const treeData = await fetchGitHubJson(
    `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(
      resolvedRef
    )}?recursive=1`,
    authToken
  );

  if (!Array.isArray(treeData.tree)) {
    throw new Error('Impossible de lire l arborescence du repository.');
  }

  if (treeData.truncated) {
    throw new Error(
      'Repository trop volumineux pour l API GitHub recursive tree (résultat tronqué).'
    );
  }

  let blobEntries = treeData.tree.filter((entry) => entry.type === 'blob');
  if (parsed.subPath) {
    const prefix = `${parsed.subPath}/`;
    blobEntries = blobEntries.filter(
      (entry) => entry.path === parsed.subPath || entry.path.startsWith(prefix)
    );
  }

  let gitignoreContent = '';
  if (applyGitignore) {
    const gitignoreEntry = blobEntries.find((entry) => entry.path === '.gitignore')
      || treeData.tree.find((entry) => entry.type === 'blob' && entry.path === '.gitignore');
    if (gitignoreEntry) {
      try {
        gitignoreContent = await fetchBlobText(
          parsed.owner,
          parsed.repo,
          resolvedRef,
          gitignoreEntry.path,
          gitignoreEntry.sha,
          authToken
        );
      } catch {
        gitignoreContent = '';
      }
    }
  }

  const ignoreFilter = createIgnoreFilter(gitignoreContent, {
    enabled: applyGitignore,
    includeDefaults: true,
  });

  const candidates = blobEntries.filter((entry) => {
    if (!entry.path || typeof entry.path !== 'string') return false;
    if (entry.size == null || entry.size === 0) return false;
    if (entry.size > MAX_FILE_SIZE) return false;
    if (ignoreFilter.ignores(entry.path)) return false;
    if (isBinaryExtension(entry.path)) return false;
    return true;
  });

  const totalBytes = candidates.reduce((sum, entry) => sum + (entry.size || 0), 0);
  const estimate = {
    owner: parsed.owner,
    repo: parsed.repo,
    ref: resolvedRef,
    subPath: parsed.subPath,
    fileCount: candidates.length,
    totalBytes,
    estimatedTokens: Math.round(totalBytes / BYTES_PER_TOKEN_ESTIMATE),
  };

  if (estimate.fileCount > maxFiles) {
    throw new Error(
      `Repository trop gros (${estimate.fileCount} fichiers texte). Limite actuelle: ${maxFiles}.`
    );
  }
  if (estimate.totalBytes > maxTotalBytes) {
    throw new Error(
      `Repository trop volumineux (${formatMegaBytes(estimate.totalBytes)}). Limite actuelle: ${formatMegaBytes(maxTotalBytes)}.`
    );
  }

  if (typeof onEstimate === 'function') {
    const shouldContinue = await onEstimate(estimate);
    if (!shouldContinue) {
      const abortError = new Error('Chargement GitHub annulé.');
      abortError.name = 'AbortError';
      throw abortError;
    }
  }

  const files = [];
  let processed = 0;

  await mapConcurrent(candidates, DOWNLOAD_CONCURRENCY, async (entry) => {
    const content = await fetchBlobText(
      parsed.owner,
      parsed.repo,
      resolvedRef,
      entry.path,
      entry.sha,
      authToken
    );

    if (!content || isBinaryContent(content)) {
      processed += 1;
      if (onProgress) onProgress(processed, candidates.length, 'download');
      return;
    }

    const extension = getExtension(entry.path.split('/').pop() || entry.path);
    const lines = content.split('\n').length;
    const tokens = countTokens(content);
    const minifiedContent = minifyCode(content, extension);
    const minifiedTokens = minifiedContent !== content ? countTokens(minifiedContent) : tokens;

    files.push({
      name: entry.path.split('/').pop() || entry.path,
      path: entry.path,
      extension,
      content,
      minifiedContent,
      size: entry.size || new Blob([content]).size,
      lines,
      tokens,
      minifiedTokens,
    });

    processed += 1;
    if (onProgress) onProgress(processed, candidates.length, 'download');
  });

  files.sort((a, b) => a.path.localeCompare(b.path));

  const projectName = `${parsed.repo}${parsed.subPath ? `/${parsed.subPath}` : ''}`;
  const tree = buildTreeFromFiles(projectName, files);

  const result = {
    name: projectName,
    files,
    tree,
    source: {
      type: 'github',
      owner: parsed.owner,
      repo: parsed.repo,
      ref: resolvedRef,
      subPath: parsed.subPath,
      input: parsed.normalizedInput,
    },
    estimate,
  };

  githubScanCache.set(cacheKey, cloneResult(result));
  pushRecentGitHubRepo({
    owner: parsed.owner,
    repo: parsed.repo,
    ref: resolvedRef,
    subPath: parsed.subPath,
    input: parsed.normalizedInput,
    scannedAt: new Date().toISOString(),
    fileCount: files.length,
  });

  return result;
}

export function getRecentGitHubRepos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_REPOS_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.owner && item.repo).slice(0, RECENT_REPOS_MAX);
  } catch {
    return [];
  }
}

function pushRecentGitHubRepo(repoMeta) {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentGitHubRepos();
    const key = `${repoMeta.owner}/${repoMeta.repo}@${repoMeta.ref}::${repoMeta.subPath || ''}`;
    const deduped = current.filter(
      (item) => `${item.owner}/${item.repo}@${item.ref}::${item.subPath || ''}` !== key
    );
    const next = [repoMeta, ...deduped].slice(0, RECENT_REPOS_MAX);
    window.localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(next));
  } catch {
    // localStorage can be unavailable in strict privacy mode.
  }
}

async function fetchGitHubJson(url, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (response.ok) return response.json();

  let message = `GitHub API error (${response.status})`;
  try {
    const data = await response.json();
    if (data && data.message) {
      message = data.message;
    }
  } catch {
    // Ignore parse errors.
  }

  const remaining = response.headers.get('x-ratelimit-remaining');
  if (response.status === 403 && remaining === '0') {
    message = 'Limite GitHub API atteinte (rate limit). Ajoutez un token GitHub ou réessayez plus tard.';
  }

  throw new Error(message);
}

async function fetchBlobText(owner, repo, ref, path, sha, token) {
  const encodedPath = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${encodedPath}`;

  try {
    const rawHeaders = {};
    if (token) {
      rawHeaders.Authorization = `Bearer ${token}`;
    }
    const rawResponse = await fetch(rawUrl, { headers: rawHeaders });
    if (rawResponse.ok) {
      return await rawResponse.text();
    }
  } catch {
    // Fallback to blob endpoint below.
  }

  if (!sha) {
    throw new Error(`Impossible de télécharger ${path}`);
  }

  const blobData = await fetchGitHubJson(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs/${sha}`,
    token
  );
  if (!blobData || blobData.encoding !== 'base64' || !blobData.content) {
    throw new Error(`Blob invalide pour ${path}`);
  }

  const base64 = blobData.content.replace(/\n/g, '');
  return decodeBase64Utf8(base64);
}

function decodeBase64Utf8(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function normalizeSubPath(subPath) {
  return String(subPath || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function buildTreeFromFiles(rootName, files) {
  const root = { name: rootName, path: '', type: 'directory', children: [] };
  const directoryIndex = new Map();
  directoryIndex.set('', root);

  files.forEach((file) => {
    const parts = file.path.split('/').filter(Boolean);
    const fileName = parts[parts.length - 1];
    const dirParts = parts.slice(0, -1);
    let currentPath = '';
    let currentNode = root;

    dirParts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (directoryIndex.has(currentPath)) {
        currentNode = directoryIndex.get(currentPath);
        return;
      }

      const dirNode = {
        name: part,
        path: currentPath,
        type: 'directory',
        children: [],
      };
      currentNode.children.push(dirNode);
      directoryIndex.set(currentPath, dirNode);
      currentNode = dirNode;
    });

    currentNode.children.push({
      name: fileName,
      path: file.path,
      type: 'file',
      extension: file.extension,
      size: file.size,
      lines: file.lines,
      tokens: file.tokens,
      minifiedTokens: file.minifiedTokens,
    });
  });

  return root;
}

function formatMegaBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cloneResult(result) {
  return JSON.parse(JSON.stringify(result));
}

async function mapConcurrent(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) continue;
      await worker(next);
    }
  });
  await Promise.all(workers);
}
