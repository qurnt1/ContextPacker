import { createIgnoreFilter } from './gitignoreParser';
import { isBinaryExtension, isBinaryContent } from './binaryDetector';
import { getExtension } from './helpers';
import { minifyCode } from './minifier';
import { countTokens, initEncoding } from './tokenCounter';
import { MAX_FILE_SIZE } from '../constants';
import { getSecurityMetadata } from './securityPolicy';
import { buildTreeFromFiles } from './treeUtils';
import { detectPotentialSecrets } from './secretDetector';

const GITHUB_API_BASE = 'https://api.github.com';
const RECENT_REPOS_KEY = 'cp-recent-github-repos';
const RECENT_REPOS_MAX = 8;
const DEFAULT_GITHUB_MAX_FILES = 1200;
const DEFAULT_GITHUB_MAX_TOTAL_BYTES = 8_000_000;
const BYTES_PER_TOKEN_ESTIMATE = 4;
const DOWNLOAD_CONCURRENCY = 6;

const githubScanCache = new Map();
const GITHUB_SCAN_CACHE_MAX = 8;

// Branch list cache: key = "owner/repo", value = { data, ts }
const branchCache = new Map();
const BRANCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BRANCH_CACHE_MAX = 16;

export function resetGitHubCaches() {
  githubScanCache.clear();
  branchCache.clear();
}

function authScope(token) {
  return token ? 'authenticated' : 'anonymous';
}

function getLru(map, key) {
  const value = map.get(key);
  if (value !== undefined) {
    map.delete(key);
    map.set(key, value);
  }
  return value;
}

function setLru(map, key, value, maxEntries) {
  map.delete(key);
  map.set(key, value);
  while (map.size > maxEntries) {
    map.delete(map.keys().next().value);
  }
}

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
      // The branch/subpath boundary is resolved once the real branch list is
      // available. Keep the whole path here so branches containing '/' remain
      // possible candidates.
      ref = decodeURIComponent(parts.slice(3).join('/'));
      parsedSubPath = '';
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

// ── Branch listing ──────────────────────────────────────────

/**
 * List all branches for a GitHub repository with metadata.
 *
 * @param {object} opts
 * @param {string} opts.repoInput  - URL or owner/repo
 * @param {string} [opts.token]    - optional GitHub PAT
 * @param {AbortSignal} [opts.signal] - abort controller signal
 * @returns {Promise<{owner, repo, defaultBranch, branches: Array}>}
 */
export async function listGitHubBranches({
  repoInput,
  token = '',
  signal,
} = {}) {
  const parsed = parseGitHubRepoInput(repoInput);
  const authToken = String(token || '').trim();
  const cacheKey = `${parsed.owner}/${parsed.repo}:${authScope(authToken)}`;

  // Check cache
  let branchData = getLru(branchCache, cacheKey);
  if (!branchData || (Date.now() - branchData.ts) >= BRANCH_CACHE_TTL) {
    // Fetch repo info (default_branch)
    const repoInfo = await fetchGitHubJson(
      `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}`,
      authToken,
      { signal }
    );

    if (repoInfo.private) {
      throw new Error('Les repositories privés ne sont pas supportés dans cette version.');
    }

    const defaultBranch = repoInfo.default_branch;

    // Paginate branches (per_page=100)
    const allBranches = [];
    let page = 1;
    while (true) {
      const pageBranches = await fetchGitHubJson(
        `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}/branches?per_page=100&page=${page}`,
        authToken,
        { signal }
      );
      if (!Array.isArray(pageBranches) || pageBranches.length === 0) break;
      allBranches.push(...pageBranches);
      if (pageBranches.length < 100) break;
      page += 1;
    }

    // Build branch objects
    const branches = allBranches.map((b) => ({
      name: b.name,
      sha: b.commit?.sha || '',
      isDefault: b.name === defaultBranch,
      protected: b.protected || false,
    }));

    // The branch endpoint does not include commit dates. Keep the default
    // branch first, then use a stable name order without extra commit calls.
    branches.sort((a, b) => {
      return (
        Number(b.isDefault) - Number(a.isDefault) ||
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base', numeric: true })
      );
    });

    branchData = {
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch,
      branches,
    };

    setLru(branchCache, cacheKey, { data: branchData, ts: Date.now() }, BRANCH_CACHE_MAX);
  } else {
    branchData = branchData.data;
  }

  const treeLocation = parsed.ref
    ? resolveTreeLocation(parsed.ref, branchData.branches)
    : { ref: '', subPath: '' };

  return {
    ...branchData,
    inputRef: treeLocation.ref,
    inputSubPath: treeLocation.subPath,
  };
}

function resolveTreeLocation(treePath, branches) {
  const normalizedPath = String(treePath || '').replace(/^\/+|\/+$/g, '');
  if (!normalizedPath) return { ref: '', subPath: '' };

  const branchNames = branches.map((branch) => branch.name).sort((a, b) => b.length - a.length);
  const matchingBranch = branchNames.find(
    (name) => normalizedPath === name || normalizedPath.startsWith(`${name}/`)
  );

  if (!matchingBranch) {
    return { ref: normalizedPath, subPath: '' };
  }

  return {
    ref: matchingBranch,
    subPath: normalizedPath.slice(matchingBranch.length).replace(/^\/+/, ''),
  };
}

// ── Tree resolution ─────────────────────────────────────────

/**
 * Resolve the current tree SHA for a branch reference.
 * Returns the tree SHA of the latest commit on the branch.
 */
async function resolveTreeSha(owner, repo, ref, authToken, signal) {
  if (/^[0-9a-f]{40}$/i.test(ref)) {
    return { treeSha: ref, commitSha: ref };
  }

  const refData = await fetchGitHubJson(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref)}`,
    authToken,
    { signal }
  );
  if (!refData?.object?.sha) {
    throw new Error(`Impossible de résoudre la branche GitHub « ${ref} ».`);
  }

  const commitData = await fetchGitHubJson(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${refData.object.sha}`,
    authToken,
    { signal }
  );
  if (!commitData?.tree?.sha) {
    throw new Error(`Impossible de résoudre le snapshot GitHub « ${ref} ».`);
  }
  return { treeSha: commitData.tree.sha, commitSha: refData.object.sha };
}

// ── Main scan ───────────────────────────────────────────────

export async function scanGitHubRepo({
  repoInput,
  ref,
  token = '',
  applyGitignore = true,
  subPath = '',
  maxFiles = DEFAULT_GITHUB_MAX_FILES,
  maxTotalBytes = DEFAULT_GITHUB_MAX_TOTAL_BYTES,
  onEstimate,
  onProgress,
  onFileStart,
  signal,
} = {}) {
  await initEncoding();
  throwIfAborted(signal);

  const parsed = parseGitHubRepoInput(repoInput, subPath);
  const authToken = String(token || '').trim();

  const repoInfo = await fetchGitHubJson(
    `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}`,
    authToken,
    { signal }
  );

  if (repoInfo.private) {
    throw new Error('Les repositories privés ne sont pas supportés dans cette version.');
  }

  // `undefined` means no explicit choice; an empty string explicitly means
  // follow the repository default branch, even when the URL contains /tree/.
  const requestedRef = ref !== undefined
    ? String(ref).trim()
    : String(parsed.ref || '').trim();
  const resolvedRef = requestedRef || repoInfo.default_branch;
  const followDefaultBranch = requestedRef === '';

  // Resolve the current tree SHA for the branch
  const { treeSha, commitSha } = await resolveTreeSha(
    parsed.owner,
    parsed.repo,
    resolvedRef,
    authToken,
    signal
  );

  // Cache key is based on immutable tree SHA
  const cacheKey = `${parsed.owner}/${parsed.repo}@${treeSha}::${parsed.subPath || ''}::${applyGitignore ? '1' : '0'}::${authScope(authToken)}`;
  const cached = getLru(githubScanCache, cacheKey);
  if (cached) {
    if (onProgress) {
      onProgress(cached.files.length, cached.files.length, 'cache');
    }
    return cloneResult(cached);
  }

  const treeData = await fetchGitHubJson(
    `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(
      treeSha
    )}?recursive=1`,
    authToken,
    { signal }
  );

  if (!Array.isArray(treeData.tree)) {
    throw new Error("Impossible de lire l'arborescence du repository.");
  }

  if (treeData.truncated) {
    throw new Error(
      "Repository trop volumineux pour l'API GitHub recursive tree (résultat tronqué)."
    );
  }

  const blockedDirectories = treeData.tree
    .filter((entry) => entry.type === 'tree')
    .map((entry) => ({ entry, security: getSecurityMetadata(entry.path, 'directory') }))
    .filter(({ security }) => security.blocked);
  const blockedDirectoryPaths = blockedDirectories.map(({ entry }) => entry.path);
  const extraNodes = blockedDirectories.map(({ entry, security }) => ({
    name: entry.path.split('/').pop(),
    path: entry.path,
    type: 'directory',
    children: [],
    ...security,
  }));

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
      gitignoreContent = await fetchRawFileText(
        parsed.owner,
        parsed.repo,
        commitSha,
        gitignoreEntry.path,
        signal
      );
    }
  }

  const ignoreFilter = createIgnoreFilter(gitignoreContent, {
    enabled: applyGitignore,
    includeDefaults: true,
  });

  const candidates = blobEntries.filter((entry) => {
    if (!entry.path || typeof entry.path !== 'string') return false;
    if (blockedDirectoryPaths.some((directory) => entry.path.startsWith(`${directory}/`))) return false;
    const security = getSecurityMetadata(entry.path, 'file');
    if (security.blocked) {
      extraNodes.push({
        name: entry.path.split('/').pop(),
        path: entry.path,
        type: 'file',
        size: entry.size ?? null,
        ...security,
      });
      return false;
    }
    if (entry.size != null && entry.size > MAX_FILE_SIZE) {
      extraNodes.push({
        name: entry.path.split('/').pop(),
        path: entry.path,
        type: 'file',
        size: entry.size,
        selectable: false,
        blocked: false,
        blockedReason: 'size',
        traversed: false,
      });
      return false;
    }
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
    throwIfAborted(signal);
    const content = await fetchRawFileText(
      parsed.owner,
      parsed.repo,
      commitSha,
      entry.path,
      signal
    );

    if (isBinaryContent(content)) {
      processed += 1;
      if (onProgress) onProgress(processed, candidates.length, 'download');
      return;
    }

    if (onFileStart) onFileStart(entry.path.split('/').pop() || entry.path);

    const extension = getExtension(entry.path.split('/').pop() || entry.path);
    const lines = content.split('\n').length;
    const tokens = countTokens(content);
    const minifiedContent = minifyCode(content, extension);
    const minifiedTokens = minifiedContent !== content ? countTokens(minifiedContent) : tokens;
    const potentialSecrets = detectPotentialSecrets(content);

    files.push({
      name: entry.path.split('/').pop() || entry.path,
      path: entry.path,
      extension,
      content,
      minifiedContent,
      size: entry.size ?? new Blob([content]).size,
      lines,
      tokens,
      minifiedTokens,
      potentialSecrets,
      selectable: true,
      blocked: false,
      blockedReason: null,
      traversed: true,
    });

    processed += 1;
    if (onProgress) onProgress(processed, candidates.length, 'download');
  });

  files.sort((a, b) => a.path.localeCompare(b.path));

  const projectName = `${parsed.repo}${parsed.subPath ? `/${parsed.subPath}` : ''}`;
  const tree = buildTreeFromFiles(projectName, files, extraNodes);

  const result = {
    name: projectName,
    files,
    tree,
    source: {
      type: 'github',
      owner: parsed.owner,
      repo: parsed.repo,
      requestedRef,
      resolvedRef,
      followDefaultBranch,
      subPath: parsed.subPath,
      input: parsed.normalizedInput,
    },
    resolvedRef,
    resolvedSha: commitSha,
    treeSha,
    estimate,
  };

  setLru(githubScanCache, cacheKey, cloneResult(result), GITHUB_SCAN_CACHE_MAX);
  pushRecentGitHubRepo({
    owner: parsed.owner,
    repo: parsed.repo,
    ref: resolvedRef,
    requestedRef,
    followDefaultBranch,
    subPath: parsed.subPath,
    input: parsed.normalizedInput,
    scannedAt: new Date().toISOString(),
    fileCount: files.length,
    resolvedSha: commitSha,
  });

  return result;
}

// ── Recent repos (localStorage) ─────────────────────────────

export function getRecentGitHubRepos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_REPOS_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.owner && item.repo).slice(0, RECENT_REPOS_MAX);
  } catch (error) {
    console.warn('Impossible de lire l’historique GitHub local.', error);
    return [];
  }
}

function pushRecentGitHubRepo(repoMeta) {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentGitHubRepos();
    const matchKey = `${repoMeta.owner}/${repoMeta.repo}:${repoMeta.requestedRef || 'default'}:${repoMeta.subPath || ''}`;
    const deduped = current.filter((item) => {
      const itemKey = `${item.owner}/${item.repo}:${item.requestedRef || item.ref || 'default'}:${item.subPath || ''}`;
      return itemKey !== matchKey;
    });
    const next = [repoMeta, ...deduped].slice(0, RECENT_REPOS_MAX);
    window.localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Impossible de sauvegarder l’historique GitHub local.', error);
  }
}

// ── GitHub API helpers ──────────────────────────────────────

async function fetchGitHubJson(url, token, { signal } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers, signal });
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

async function fetchRawFileText(owner, repo, commitSha, path, signal) {
  const encodedPath = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${encodedPath}`;

  try {
    const rawResponse = await fetch(rawUrl, { signal });
    if (rawResponse.ok) {
      return await rawResponse.text();
    }
  } catch (error) {
    if (error?.name === 'AbortError' || signal?.aborted) {
      throw error;
    }
  }

  throw new Error(`Impossible de télécharger ${path}`);
}

function normalizeSubPath(subPath) {
  return String(subPath || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
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

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error('Chargement GitHub annulé.');
  error.name = 'AbortError';
  throw error;
}
