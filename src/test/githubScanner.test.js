import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the module under test
import {
  listGitHubBranches,
  parseGitHubRepoInput,
  resetGitHubCaches,
  scanGitHubRepo,
} from '../utils/githubScanner';

function jsonResponse(data, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] || null },
    json: vi.fn().mockResolvedValue(data),
  };
}

function textResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(data),
  };
}

describe('parseGitHubRepoInput', () => {
  it('parses a full GitHub URL', () => {
    const result = parseGitHubRepoInput('https://github.com/facebook/react');
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
    expect(result.ref).toBe('');
    expect(result.subPath).toBe('');
  });

  it('parses owner/repo shorthand', () => {
    const result = parseGitHubRepoInput('facebook/react');
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
  });

  it('extracts branch ref from tree URL', () => {
    const result = parseGitHubRepoInput('https://github.com/facebook/react/tree/main');
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
    expect(result.ref).toBe('main');
    expect(result.subPath).toBe('');
  });

  it('extracts branch with slash from tree URL', () => {
    const result = parseGitHubRepoInput('https://github.com/facebook/react/tree/feature/v4-fixes');
    expect(result.ref).toBe('feature/v4-fixes');
  });

  it('extracts ref from hash shorthand', () => {
    const result = parseGitHubRepoInput('facebook/react#develop');
    expect(result.ref).toBe('develop');
  });

  it('handles .git suffix', () => {
    const result = parseGitHubRepoInput('https://github.com/user/repo.git');
    expect(result.repo).toBe('repo');
  });

  it('rejects empty input', () => {
    expect(() => parseGitHubRepoInput('')).toThrow('Entrez une URL GitHub');
  });

  it('rejects non-GitHub URLs', () => {
    expect(() => parseGitHubRepoInput('https://gitlab.com/user/repo')).toThrow('github.com');
  });

  it('normalizes input that starts with github.com/', () => {
    const result = parseGitHubRepoInput('github.com/user/repo');
    expect(result.owner).toBe('user');
    expect(result.repo).toBe('repo');
  });
});

describe('listGitHubBranches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetGitHubCaches();
  });

  it('paginates branches without per-branch commit calls and forwards the token', async () => {
    const branches = Array.from({ length: 100 }, (_, index) => ({
      name: `branch-${String(index).padStart(3, '0')}`,
      commit: { sha: 'same-sha' },
    }));
    branches.push({ name: 'feature/v4-fixes', commit: { sha: 'new-sha' } });
    global.fetch = vi.fn(async (url) => {
      if (url.endsWith('/repos/acme/packer')) {
        return jsonResponse({ default_branch: 'main', private: false });
      }
      if (url.includes('/branches?') && new URL(url).searchParams.get('page') === '1') {
        return jsonResponse(branches.slice(0, 100));
      }
      if (url.includes('/branches?') && new URL(url).searchParams.get('page') === '2') {
        return jsonResponse(branches.slice(100));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await listGitHubBranches({ repoInput: 'acme/packer', token: 'secret-token' });

    expect(result.branches).toHaveLength(101);
    expect(result.branches[0].name).toBe('branch-000');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/acme/packer'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }) })
    );
    expect(global.fetch.mock.calls.some(([url]) => url.includes('/commits/'))).toBe(false);
  });

  it('resolves a branch with slashes and its URL subpath', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.endsWith('/repos/acme/tree-app')) {
        return jsonResponse({ default_branch: 'main', private: false });
      }
      if (url.includes('/branches?')) {
        return jsonResponse([
          { name: 'main', commit: { sha: 'main-sha' } },
          { name: 'feature/v4-fixes', commit: { sha: 'feature-sha' } },
        ]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await listGitHubBranches({
      repoInput: 'https://github.com/acme/tree-app/tree/feature/v4-fixes/src/components',
    });

    expect(result.inputRef).toBe('feature/v4-fixes');
    expect(result.inputSubPath).toBe('src/components');
  });

  it('propagates branch listing rate-limit errors', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.endsWith('/repos/acme/rate-limit')) {
        return jsonResponse({ default_branch: 'main', private: false });
      }
      if (url.includes('/branches?')) {
        return jsonResponse({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(listGitHubBranches({ repoInput: 'acme/rate-limit' })).rejects.toThrow('Limite GitHub API');
  });

  it('allows overriding a tree URL with explicit default-branch mode', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.endsWith('/repos/acme/repo')) {
        return jsonResponse({ default_branch: 'main', private: false });
      }
      if (url.endsWith('/git/ref/heads/main')) {
        return jsonResponse({ object: { sha: 'main-commit' } });
      }
      if (url.endsWith('/git/commits/main-commit')) {
        return jsonResponse({ tree: { sha: 'main-tree' } });
      }
      if (url.includes('/git/trees/main-tree?recursive=1')) {
        return jsonResponse({ tree: [], truncated: false });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await scanGitHubRepo({
      repoInput: 'https://github.com/acme/repo/tree/feature/test/src',
      ref: '',
      subPath: 'src',
    });

    expect(result.source.requestedRef).toBe('');
    expect(result.source.followDefaultBranch).toBe(true);
    expect(result.source.resolvedRef).toBe('main');
  });
});

describe('scanGitHubRepo file downloads', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetGitHubCaches();
  });

  it('downloads files from raw URLs pinned to the resolved commit SHA', async () => {
    const commitSha = '0123456789abcdef0123456789abcdef01234567';
    const treeSha = '76543210fedcba9876543210fedcba9876543210';
    const rawBase = `https://raw.githubusercontent.com/acme/raw-repo/${commitSha}/`;

    global.fetch = vi.fn(async (url) => {
      if (url.endsWith('/repos/acme/raw-repo')) {
        return jsonResponse({ default_branch: 'main', private: false });
      }
      if (url.endsWith('/git/ref/heads/main')) {
        return jsonResponse({ object: { sha: commitSha } });
      }
      if (url.endsWith(`/git/commits/${commitSha}`)) {
        return jsonResponse({ tree: { sha: treeSha } });
      }
      if (url.endsWith(`/git/trees/${treeSha}?recursive=1`)) {
        return jsonResponse({
          tree: [
            { path: 'src/index.js', type: 'blob', sha: 'index-blob', size: 18 },
            { path: 'src/nested/view.js', type: 'blob', sha: 'view-blob', size: 19 },
          ],
          truncated: false,
        });
      }
      if (url === `${rawBase}src/index.js`) {
        return textResponse('export default 1;');
      }
      if (url === `${rawBase}src/nested/view.js`) {
        return textResponse('export default 2;');
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await scanGitHubRepo({
      repoInput: 'acme/raw-repo',
      subPath: 'src',
      token: 'secret-token',
      applyGitignore: false,
    });

    const rawCalls = global.fetch.mock.calls.filter(([url]) => url.startsWith(rawBase));
    expect(rawCalls.map(([url]) => url).sort()).toEqual([
      `${rawBase}src/index.js`,
      `${rawBase}src/nested/view.js`,
    ]);
    expect(global.fetch.mock.calls.some(([url]) => url.includes('/git/blobs/'))).toBe(false);
    expect(rawCalls).toHaveLength(2);
    expect(rawCalls.every(([, options]) => !options.headers?.Authorization)).toBe(true);
    expect(result.resolvedSha).toBe(commitSha);
    expect(result.treeSha).toBe(treeSha);
    expect(result.files.map((file) => file.path)).toEqual(['src/index.js', 'src/nested/view.js']);
  });

  it('surfaces a raw download failure instead of returning partial content', async () => {
    const commitSha = '0123456789abcdef0123456789abcdef01234567';
    const treeSha = '76543210fedcba9876543210fedcba9876543210';

    global.fetch = vi.fn(async (url) => {
      if (url.endsWith('/repos/acme/raw-repo')) return jsonResponse({ default_branch: 'main', private: false });
      if (url.endsWith('/git/ref/heads/main')) return jsonResponse({ object: { sha: commitSha } });
      if (url.endsWith(`/git/commits/${commitSha}`)) return jsonResponse({ tree: { sha: treeSha } });
      if (url.endsWith(`/git/trees/${treeSha}?recursive=1`)) {
        return jsonResponse({ tree: [{ path: 'src/index.js', type: 'blob', size: 18 }], truncated: false });
      }
      return new Response('missing', { status: 404 });
    });

    await expect(scanGitHubRepo({ repoInput: 'acme/raw-repo', subPath: 'src', applyGitignore: false }))
      .rejects.toThrow('Impossible de télécharger src/index.js');
  });
});
