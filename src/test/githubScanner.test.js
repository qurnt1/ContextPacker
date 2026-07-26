import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the module under test
import { listGitHubBranches, parseGitHubRepoInput, scanGitHubRepo } from '../utils/githubScanner';

function jsonResponse(data, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] || null },
    json: vi.fn().mockResolvedValue(data),
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
  });

  it('paginates, deduplicates commit SHAs, sorts branches, and forwards the token', async () => {
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
      if (url.endsWith('/commits/same-sha')) {
        return jsonResponse({ commit: { committer: { date: '2024-01-01T00:00:00Z' } } });
      }
      if (url.endsWith('/commits/new-sha')) {
        return jsonResponse({ commit: { committer: { date: '2025-01-01T00:00:00Z' } } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await listGitHubBranches({ repoInput: 'acme/packer', token: 'secret-token' });

    expect(result.branches).toHaveLength(101);
    expect(result.branches[0].name).toBe('feature/v4-fixes');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/acme/packer'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }) })
    );
    expect(global.fetch.mock.calls.filter(([url]) => url.endsWith('/commits/same-sha'))).toHaveLength(1);
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
      if (url.endsWith('/commits/main-sha') || url.endsWith('/commits/feature-sha')) {
        return jsonResponse({ commit: { committer: { date: '2024-01-01T00:00:00Z' } } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await listGitHubBranches({
      repoInput: 'https://github.com/acme/tree-app/tree/feature/v4-fixes/src/components',
    });

    expect(result.inputRef).toBe('feature/v4-fixes');
    expect(result.inputSubPath).toBe('src/components');
  });

  it('propagates commit metadata errors instead of caching incomplete dates', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.endsWith('/repos/acme/rate-limit')) {
        return jsonResponse({ default_branch: 'main', private: false });
      }
      if (url.includes('/branches?')) {
        return jsonResponse([{ name: 'main', commit: { sha: 'limited-sha' } }]);
      }
      if (url.endsWith('/commits/limited-sha')) {
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
