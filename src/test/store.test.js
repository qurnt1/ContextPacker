import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockDirHandle(name) {
  return {
    kind: 'directory',
    name,
    queryPermission: vi.fn().mockResolvedValue('granted'),
    requestPermission: vi.fn().mockResolvedValue('granted'),
    isSameEntry: vi.fn().mockResolvedValue(false),
    values: async function* () { /* empty */ },
    getFileHandle: vi.fn(),
    getDirectoryHandle: vi.fn(),
  };
}

vi.mock('../utils/handleStorage', () => ({
  saveHandle: vi.fn().mockResolvedValue(undefined),
  getHandle: vi.fn().mockResolvedValue(mockDirHandle('test')),
  deleteHandle: vi.fn().mockResolvedValue(undefined),
  findMatchingHandle: vi.fn().mockResolvedValue(null),
  migrateOldHandle: vi.fn().mockResolvedValue(null),
  listHandles: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/scanner', () => ({
  scanDirectory: vi.fn().mockResolvedValue({
    name: 'test-project',
    files: [{ name: 'index.js', path: 'index.js', extension: '.js', size: 100, lines: 10, tokens: 50, minifiedTokens: 30, content: 'test', minifiedContent: 'test' }],
    tree: { name: 'test-project', path: '', type: 'directory', children: [{ name: 'index.js', path: 'index.js', type: 'file', extension: '.js', size: 100, lines: 10, tokens: 50, minifiedTokens: 30 }] },
  }),
}));

vi.mock('../utils/githubScanner', () => ({
  scanGitHubRepo: vi.fn().mockResolvedValue({
    name: 'test-repo', files: [], tree: { name: 'test-repo', path: '', type: 'directory', children: [] },
    source: { type: 'github', owner: 'test', repo: 'repo', ref: 'main', subPath: '', input: 'https://github.com/test/repo' },
    resolvedRef: 'main', resolvedSha: 'abc123',
  }),
  getRecentGitHubRepos: vi.fn().mockReturnValue([]),
}));

import { isAboveWarningThreshold, useStore } from '../store';
import { getHandle, deleteHandle } from '../utils/handleStorage';

describe('Store defaults', () => {
  it('starts with a 200k token limit', () => {
    expect(useStore.getInitialState().tokenLimit).toBe(200_000);
  });
});

describe('Store — local project identity', () => {
  beforeEach(() => {
    useStore.setState({ recentProjects: [], favoriteProjects: [], files: [], projectName: '', selectedPaths: new Set(), isScanning: false });
    vi.clearAllMocks();
  });

  it('stores projects with UUID-based keys', () => {
    useStore.getState().addRecentProject({ id: 'uuid-abc', key: 'local:uuid-abc', type: 'local', name: 'my-project', fileCount: 10, totalTokens: 5000, openedAt: new Date().toISOString() });
    expect(useStore.getState().recentProjects[0].key).toBe('local:uuid-abc');
  });

  it('two folders with same name get different keys', () => {
    useStore.getState().addRecentProject({ id: 'uuid-1', key: 'local:uuid-1', type: 'local', name: 'src', fileCount: 10, totalTokens: 5000, openedAt: new Date().toISOString() });
    useStore.getState().addRecentProject({ id: 'uuid-2', key: 'local:uuid-2', type: 'local', name: 'src', fileCount: 20, totalTokens: 8000, openedAt: new Date().toISOString() });
    expect(useStore.getState().recentProjects).toHaveLength(2);
  });

  it('deduplicates by key', () => {
    useStore.getState().addRecentProject({ id: 'uuid-xyz', key: 'local:uuid-xyz', type: 'local', name: 'proj', fileCount: 5, totalTokens: 100, openedAt: '2024-01-01T00:00:00.000Z' });
    useStore.getState().addRecentProject({ id: 'uuid-xyz', key: 'local:uuid-xyz', type: 'local', name: 'proj', fileCount: 15, totalTokens: 500, openedAt: '2024-06-01T00:00:00.000Z' });
    expect(useStore.getState().recentProjects).toHaveLength(1);
    expect(useStore.getState().recentProjects[0].fileCount).toBe(15);
  });

  it('removes recent project and cleans up IndexedDB', () => {
    useStore.getState().addRecentProject({ id: 'uuid-del', key: 'local:uuid-del', type: 'local', name: 'tmp', fileCount: 1, totalTokens: 10, openedAt: new Date().toISOString() });
    useStore.getState().removeRecentProject('local:uuid-del');
    expect(useStore.getState().recentProjects).toHaveLength(0);
    expect(deleteHandle).toHaveBeenCalledWith('uuid-del');
  });

  it('handleReopenLocal retrieves correct handle', async () => {
    getHandle.mockResolvedValueOnce(mockDirHandle('test-dir'));
    const result = await useStore.getState().handleReopenLocal({ id: 'uuid-test', key: 'local:uuid-test', name: 'test-dir' });
    expect(result.ok).toBe(true);
    expect(getHandle).toHaveBeenCalledWith('uuid-test');
  });

  it('handleReopenLocal returns error for old-style keys', async () => {
    const result = await useStore.getState().handleReopenLocal({ key: 'local:src', name: 'src' });
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe('MISSING_HANDLE');
  });

  it('handleReopenLocal returns error when no handle stored', async () => {
    getHandle.mockResolvedValueOnce(null);
    const result = await useStore.getState().handleReopenLocal({ id: 'uuid-ghost', key: 'local:uuid-ghost', name: 'ghost' });
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe('MISSING_HANDLE');
  });

  it('handleReopenLocal returns PERMISSION_DENIED', async () => {
    const denied = mockDirHandle('nope');
    denied.queryPermission.mockResolvedValue('denied');
    denied.requestPermission.mockResolvedValue('denied');
    getHandle.mockResolvedValueOnce(denied);
    const result = await useStore.getState().handleReopenLocal({ id: 'uuid-denied', key: 'local:uuid-denied', name: 'denied' });
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe('PERMISSION_DENIED');
  });

  it('handleReopenLocal converts permission API rejections into an error result', async () => {
    const failing = mockDirHandle('broken');
    failing.queryPermission.mockRejectedValueOnce(new Error('permission failure'));
    getHandle.mockResolvedValueOnce(failing);

    const result = await useStore.getState().handleReopenLocal({ id: 'uuid-broken', key: 'local:uuid-broken', name: 'broken' });

    expect(result).toMatchObject({ ok: false, aborted: false });
    expect(result.error).toHaveProperty('message', 'permission failure');
  });

  it('handleRefresh converts local permission API rejections into an error result', async () => {
    const failing = mockDirHandle('broken-refresh');
    failing.queryPermission.mockRejectedValueOnce(new Error('refresh permission failure'));
    getHandle.mockResolvedValueOnce(failing);
    useStore.setState({ sourceMeta: { type: 'local', projectId: 'uuid-refresh' } });

    const result = await useStore.getState().handleRefresh();

    expect(result).toMatchObject({ ok: false, aborted: false });
    expect(result.error).toHaveProperty('message', 'refresh permission failure');
  });
});

describe('Store — visible selection behavior', () => {
  beforeEach(() => {
    useStore.setState({
      files: [
        { path: 'a.js', tokens: 40, minifiedTokens: 20 },
        { path: 'b.js', tokens: 40, minifiedTokens: 20 },
        { path: 'c.js', tokens: 40, minifiedTokens: 20 },
      ],
      selectedPaths: new Set(['a.js']),
      minifyEnabled: false,
      tokenLimit: 1000,
      warningPercent: 80,
      customThreshold: 0,
      showWarning: false,
      pendingPaths: null,
      warningAccepted: false,
      warningKind: null,
      potentialSecretsAllowed: false,
    });
  });

  it('selectRange uses the supplied visible order', () => {
    useStore.getState().selectRange('a.js', 'c.js', ['a.js', 'c.js']);
    expect([...useStore.getState().selectedPaths]).toEqual(['a.js', 'c.js']);
  });

  it('selection over the threshold is deferred for confirmation', () => {
    useStore.setState({ tokenLimit: 100, warningPercent: 50 });
    useStore.getState().selectRange('a.js', 'c.js', ['a.js', 'b.js', 'c.js']);

    expect(useStore.getState().showWarning).toBe(true);
    expect(useStore.getState().selectedPaths).toEqual(new Set(['a.js']));
    expect(useStore.getState().pendingPaths).toEqual(new Set(['a.js', 'b.js', 'c.js']));
  });

  it('uses the configured percentage and manual threshold in one rule', () => {
    expect(isAboveWarningThreshold(40, 100, 40)).toBe(false);
    expect(isAboveWarningThreshold(41, 100, 40)).toBe(true);
    expect(isAboveWarningThreshold(31, 100, 80, 30)).toBe(true);
    expect(isAboveWarningThreshold(31, 100, 80, 0)).toBe(false);
  });

  it('does not warn when minification reduces an already selected context', () => {
    useStore.setState({
      selectedPaths: new Set(['a.js']),
      tokenLimit: 100,
      warningPercent: 30,
      showWarning: false,
      pendingPaths: null,
      minifyEnabled: false,
    });

    useStore.getState().setMinifyEnabled(true);

    expect(useStore.getState().showWarning).toBe(false);
    expect(useStore.getState().pendingPaths).toBeNull();
  });

  it('never selects blocked files', () => {
    useStore.setState({
      files: [
        { path: '.env', blocked: true, selectable: false },
        { path: 'public.js', tokens: 10, minifiedTokens: 10 },
      ],
      selectedPaths: new Set(),
    });

    useStore.getState().selectAll();

    expect(useStore.getState().selectedPaths).toEqual(new Set(['public.js']));
  });

  it('requires explicit confirmation before selecting potential secrets', () => {
    useStore.setState({
      files: [
        { path: 'config.js', tokens: 10, minifiedTokens: 10, potentialSecrets: [{ kind: 'credential-assignment', line: 1 }] },
        { path: 'public.js', tokens: 10, minifiedTokens: 10, potentialSecrets: [] },
      ],
      selectedPaths: new Set(),
      potentialSecretsAllowed: false,
    });

    useStore.getState().selectAll();
    expect(useStore.getState().selectedPaths).toEqual(new Set(['public.js']));

    useStore.getState().acknowledgePotentialSecrets();
    useStore.getState().selectAll();
    expect(useStore.getState().selectedPaths).toEqual(new Set(['config.js', 'public.js']));
  });

  it('accepts the selection warning once for the current session', () => {
    useStore.setState({ tokenLimit: 100, warningPercent: 50 });
    useStore.getState().selectRange('a.js', 'c.js', ['a.js', 'b.js', 'c.js']);
    expect(useStore.getState().showWarning).toBe(true);

    useStore.getState().confirmWarning();
    useStore.getState().deselectAll();
    useStore.getState().selectAll();

    expect(useStore.getState().showWarning).toBe(false);
    expect(useStore.getState().selectedPaths).toEqual(new Set(['a.js', 'b.js', 'c.js']));
  });

  it('scopes warning acceptance to the current project context', () => {
    useStore.setState({
      sourceMeta: { type: 'local', projectId: 'project-one' },
      selectedPaths: new Set(),
      tokenLimit: 100,
      warningPercent: 50,
      showWarning: false,
      pendingPaths: null,
      warningAccepted: false,
      warningAcceptedKey: null,
    });

    useStore.getState().selectAll();
    expect(useStore.getState().showWarning).toBe(true);
    useStore.getState().confirmWarning();
    useStore.getState().deselectAll();

    useStore.setState({ sourceMeta: { type: 'local', projectId: 'project-two' } });
    useStore.getState().selectAll();
    expect(useStore.getState().showWarning).toBe(true);
  });

  it('does not attach a selection payload to settings warnings', () => {
    useStore.setState({
      selectedPaths: new Set(['a.js']),
      tokenLimit: 10,
      warningPercent: 50,
      pendingPaths: null,
      showWarning: false,
    });

    useStore.getState().setTokenLimit(1);

    expect(useStore.getState().showWarning).toBe(true);
    expect(useStore.getState().warningKind).toBe('settings');
    expect(useStore.getState().pendingPaths).toBeNull();
  });

  it('preserves valid selections when refreshing the same project', () => {
    useStore.setState({
      projectLoaded: true,
      sourceMeta: { type: 'local', projectId: 'refresh-id' },
      selectedPaths: new Set(['a.js']),
      savedSelection: null,
    });

    useStore.getState().completeScan({
      name: 'test-project',
      files: [
        { path: 'a.js', selectable: true, blocked: false },
        { path: 'new.js', selectable: true, blocked: false },
      ],
      tree: { name: 'test-project', path: '', type: 'directory', children: [] },
      source: { type: 'local' },
      projectId: 'refresh-id',
    });

    expect(useStore.getState().selectedPaths).toEqual(new Set(['a.js']));
  });

  it('does not restore potential-secret selections after a fresh scan', () => {
    useStore.setState({
      projectLoaded: true,
      sourceMeta: { type: 'local', projectId: 'refresh-secret-id' },
      selectedPaths: new Set(['config.js']),
      potentialSecretsAllowed: true,
      savedSelection: null,
    });

    useStore.getState().completeScan({
      name: 'test-project',
      files: [
        { path: 'config.js', selectable: true, blocked: false, potentialSecrets: [{ kind: 'credential-assignment', line: 1 }] },
        { path: 'public.js', selectable: true, blocked: false, potentialSecrets: [] },
      ],
      tree: { name: 'test-project', path: '', type: 'directory', children: [] },
      source: { type: 'local' },
      projectId: 'refresh-secret-id',
    });

    expect(useStore.getState().selectedPaths).toEqual(new Set());
    expect(useStore.getState().potentialSecretsAllowed).toBe(false);
  });
});

describe('Store — favorites', () => {
  beforeEach(() => { useStore.setState({ recentProjects: [], favoriteProjects: [] }); });

  it('toggleFavorite adds and removes', () => {
    useStore.getState().toggleFavorite('local:uuid-a');
    expect(useStore.getState().favoriteProjects).toContain('local:uuid-a');
    useStore.getState().toggleFavorite('local:uuid-a');
    expect(useStore.getState().favoriteProjects).not.toContain('local:uuid-a');
  });

  it('opening a project does not remove favorite status', () => {
    useStore.getState().addRecentProject({ id: 'uuid-fav', key: 'local:uuid-fav', type: 'local', name: 'fav', fileCount: 5, totalTokens: 100, openedAt: new Date().toISOString() });
    useStore.getState().toggleFavorite('local:uuid-fav');
    useStore.getState().addRecentProject({ id: 'uuid-fav', key: 'local:uuid-fav', type: 'local', name: 'fav', fileCount: 6, totalTokens: 200, openedAt: new Date().toISOString() });
    expect(useStore.getState().favoriteProjects).toContain('local:uuid-fav');
  });
});

describe('Store — GitHub dedup', () => {
  beforeEach(() => { useStore.setState({ recentProjects: [], favoriteProjects: [] }); });

  it('updates existing entry instead of creating new one per commit', () => {
    useStore.getState().addRecentProject({ key: 'github:owner/repo:default:', type: 'github', name: 'repo', owner: 'owner', repo: 'repo', ref: 'main', followDefaultBranch: true, subPath: '', fileCount: 10, totalTokens: 1000, resolvedSha: 'abc123', openedAt: '2024-01-01T00:00:00.000Z' });
    useStore.getState().addRecentProject({ key: 'github:owner/repo:default:', type: 'github', name: 'repo', owner: 'owner', repo: 'repo', ref: 'main', followDefaultBranch: true, subPath: '', fileCount: 12, totalTokens: 1200, resolvedSha: 'def456', openedAt: '2024-06-01T00:00:00.000Z' });
    expect(useStore.getState().recentProjects).toHaveLength(1);
    expect(useStore.getState().recentProjects[0].resolvedSha).toBe('def456');
  });

  it('different refs are different entries', () => {
    useStore.getState().addRecentProject({ key: 'github:owner/repo:main:', type: 'github', name: 'repo (main)', owner: 'owner', repo: 'repo', ref: 'main', followDefaultBranch: true, subPath: '', fileCount: 10, totalTokens: 1000, openedAt: new Date().toISOString() });
    useStore.getState().addRecentProject({ key: 'github:owner/repo:develop:', type: 'github', name: 'repo (develop)', owner: 'owner', repo: 'repo', ref: 'develop', followDefaultBranch: false, subPath: '', fileCount: 8, totalTokens: 800, openedAt: new Date().toISOString() });
    expect(useStore.getState().recentProjects).toHaveLength(2);
  });

  it('loadGithubHistory deduplicates entries with same key', async () => {
    const gh = await import('../utils/githubScanner');
    gh.getRecentGitHubRepos.mockReturnValue([
      { owner: 'o', repo: 'r', ref: 'main', subPath: '', scannedAt: '2024-01-01T00:00:00.000Z', fileCount: 10 },
      { owner: 'o', repo: 'r', ref: 'main', subPath: '', scannedAt: '2024-06-01T00:00:00.000Z', fileCount: 15 },
    ]);
    useStore.getState().loadGithubHistory();
    // Should have only 1 entry (deduped by key)
    expect(useStore.getState().recentProjects.filter(p => p.type === 'github')).toHaveLength(1);
  });
});
