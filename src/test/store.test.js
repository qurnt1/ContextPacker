import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockDirHandle(name) {
  return {
    kind: 'directory',
    name,
    queryPermission: vi.fn().mockResolvedValue('granted'),
    requestPermission: vi.fn().mockResolvedValue('granted'),
    values: async function* values() {},
  };
}

vi.mock('../utils/handleStorage', () => ({
  saveHandle: vi.fn().mockResolvedValue(true),
  getHandle: vi.fn().mockResolvedValue(mockDirHandle('test')),
  deleteHandle: vi.fn().mockResolvedValue(true),
  findMatchingHandle: vi.fn().mockResolvedValue(null),
  migrateOldHandle: vi.fn().mockResolvedValue(null),
}));

vi.mock('../utils/scanner', () => ({
  scanDirectory: vi.fn().mockResolvedValue({
    name: 'test-project',
    files: [{ name: 'index.js', path: 'index.js', extension: '.js', size: 100, lines: 1, tokens: 10, minifiedTokens: 6, content: 'const test = true;', minifiedContent: 'const test=true;' }],
    tree: { name: 'test-project', path: '', type: 'directory', children: [] },
  }),
}));

import { isAboveWarningThreshold, useStore } from '../store';
import { deleteHandle, getHandle } from '../utils/handleStorage';
import { scanDirectory } from '../utils/scanner';

beforeEach(() => {
  useStore.setState({
    projectLoaded: false,
    projectName: '',
    files: [],
    tree: null,
    sourceMeta: null,
    selectedPaths: new Set(),
    savedSelection: null,
    showWarning: false,
    pendingPaths: null,
    warningKind: null,
    warningAccepted: false,
    warningAcceptedKey: null,
    isScanning: false,
    recentProjects: [],
    favoriteProjects: [],
    tokenLimit: 1_000_000,
    warningPercent: 40,
    minifyEnabled: false,
    gitignoreEnabled: true,
  });
  vi.clearAllMocks();
});

describe('store local workflow', () => {
  it('starts with a 1M token limit and persists the simplified settings key', () => {
    expect(useStore.getInitialState().tokenLimit).toBe(1_000_000);
    useStore.getState().setTokenLimit(500_000);
    const persisted = JSON.parse(localStorage.getItem('contextpacker-settings'));
    expect(persisted.state.tokenLimit).toBe(500_000);
  });

  it('uses only the configured percentage warning', () => {
    expect(isAboveWarningThreshold(40, 100, 40)).toBe(false);
    expect(isAboveWarningThreshold(41, 100, 40)).toBe(true);
  });

  it('selects ordinary source even when its text looks credential-like', () => {
    useStore.setState({ files: [
      { path: 'config.js', tokens: 10, minifiedTokens: 8, content: 'const apiKey = "example";' },
      { path: 'public.js', tokens: 10, minifiedTokens: 8 },
    ] });
    useStore.getState().selectAll();
    expect(useStore.getState().selectedPaths).toEqual(new Set(['config.js', 'public.js']));
  });

  it('keeps technical exclusions out of selection', () => {
    useStore.setState({ files: [
      { path: '.git/config', selectable: false, blocked: true },
      { path: 'public.js', tokens: 10, minifiedTokens: 8 },
    ] });
    useStore.getState().selectAll();
    expect(useStore.getState().selectedPaths).toEqual(new Set(['public.js']));
  });

  it('defers a selection above the warning threshold', () => {
    useStore.setState({
      files: [{ path: 'a.js', tokens: 40, minifiedTokens: 20 }, { path: 'b.js', tokens: 40, minifiedTokens: 20 }],
      tokenLimit: 100,
      warningPercent: 50,
    });
    useStore.getState().selectAll();
    expect(useStore.getState().showWarning).toBe(true);
    expect(useStore.getState().selectedPaths).toEqual(new Set());
    useStore.getState().confirmWarning();
    expect(useStore.getState().selectedPaths).toEqual(new Set(['a.js', 'b.js']));
  });

  it('restores valid selections for the same local project', () => {
    useStore.setState({
      projectLoaded: true,
      sourceMeta: { type: 'local', projectId: 'project-id' },
      selectedPaths: new Set(['a.js']),
    });
    useStore.getState().completeScan({
      name: 'demo',
      projectId: 'project-id',
      files: [{ path: 'a.js', selectable: true }, { path: 'new.js', selectable: true }],
      tree: { name: 'demo', path: '', type: 'directory', children: [] },
    });
    expect(useStore.getState().selectedPaths).toEqual(new Set(['a.js']));
  });

  it('scans and records a local project', async () => {
    const handle = mockDirHandle('demo');
    const result = await useStore.getState().scanFromHandle(handle);
    expect(result.ok).toBe(true);
    expect(useStore.getState().sourceMeta.type).toBe('local');
    expect(scanDirectory).toHaveBeenCalledWith(handle, expect.any(Function), expect.objectContaining({ applyGitignore: true }));
  });

  it('reopens a stored local project and cleans its history', async () => {
    const result = await useStore.getState().handleReopenLocal({ id: 'project-id', key: 'local:project-id', name: 'demo' });
    expect(result.ok).toBe(true);
    expect(getHandle).toHaveBeenCalledWith('project-id');
    useStore.getState().addRecentProject({ id: 'project-id', key: 'local:project-id', type: 'local', name: 'demo' });
    useStore.getState().removeRecentProject('local:project-id');
    expect(deleteHandle).toHaveBeenCalledWith('project-id');
  });
});
