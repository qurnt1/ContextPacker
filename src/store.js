import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scanDirectory } from './utils/scanner';
import { scanGitHubRepo, getRecentGitHubRepos } from './utils/githubScanner';
import { generatePlainOutput } from './utils/outputFormatter';
import {
  saveHandle,
  getHandle,
  deleteHandle,
  findMatchingHandle,
  migrateOldHandle,
} from './utils/handleStorage';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Build the logical identity key for a GitHub project.
 * Uses owner/repo + requested ref (or 'default') + subpath.
 */
function githubLogicalKey(owner, repo, requestedRef, followDefault, subPath) {
  const refPart = followDefault ? 'default' : (requestedRef || 'default');
  return `github:${owner}/${repo}:${refPart}:${subPath || ''}`;
}

/**
 * Build a stable project key for savedSelection.
 * Local:  local:<uuid>
 * GitHub: github:<owner>/<repo>:<requestedRef-or-default>:<subPath>
 */
function stableProjectKey(sourceMeta, projectId) {
  if (sourceMeta.type === 'github') {
    const s = sourceMeta;
    return githubLogicalKey(s.owner, s.repo, s.requestedRef, s.followDefaultBranch, s.subPath);
  }
  return `local:${projectId || ''}`;
}

/**
 * Pure function — compute token sum for a given set of paths.
 * Testable independently of the store.
 */
export function calculateSelectionTokens(files, paths, minifyEnabled) {
  let sum = 0;
  for (const f of files) {
    if (paths.has(f.path)) {
      sum += minifyEnabled ? f.minifiedTokens : f.tokens;
    }
  }
  return sum;
}

// ── Scan Slice ──────────────────────────────────────────────
const createScanSlice = (set, get) => ({
  projectName: '',
  projectLoaded: false,
  files: [],
  tree: null,
  sourceMeta: null,
  scanMode: 'local',
  isScanning: false,
  scanCount: 0,
  scanTotal: 0,
  scanError: '',
  currentFile: '',

  startScan: (mode) =>
    set({ isScanning: true, scanCount: 0, scanTotal: 0, scanMode: mode, scanError: '', currentFile: '' }),

  updateProgress: (count, total) =>
    set({ scanCount: count, scanTotal: total ?? get().scanTotal }),

  setCurrentFile: (name) => set({ currentFile: name }),

  completeScan: ({ name, files, tree, source, projectId }) => {
    const saved = get().savedSelection;
    const pKey = stableProjectKey(source || { type: get().scanMode }, projectId);
    const restorePaths = saved && saved.projectKey === pKey
      ? new Set(saved.paths.filter(p => files.some(f => f.path === p)))
      : new Set();

    set({
      projectName: name,
      projectLoaded: true,
      files,
      tree,
      sourceMeta: { ...(source || { type: get().scanMode }), projectId },
      isScanning: false,
      selectedPaths: restorePaths,
      scanError: '',
      scanCount: 0,
      scanTotal: 0,
      currentFile: '',
      savedSelection: restorePaths.size > 0 ? null : saved,
    });
  },

  failScan: (error) =>
    set({ isScanning: false, scanError: error || 'Erreur inconnue.' }),

  scanFromHandle: async (dirHandle) => {
    const { startScan, updateProgress, completeScan, failScan, gitignoreEnabled, addRecentProject } = get();
    try {
      startScan('local');

      // Check if this handle matches an existing project via isSameEntry()
      let projectId = await findMatchingHandle(dirHandle);

      if (!projectId) {
        // Attempt migration: look for an old entry keyed by folder name (pre-UUID format)
        const oldEntry = get().recentProjects.find(
          (p) => p.type === 'local' && p.name === dirHandle.name && /^local:[^a-f0-9-]/.test(p.key)
        );
        if (oldEntry) {
          projectId = crypto.randomUUID();
          const migratedHandle = await migrateOldHandle(dirHandle.name, projectId);
          if (migratedHandle) {
            set((state) => ({
              recentProjects: state.recentProjects.map((p) =>
                p.key === oldEntry.key
                  ? { ...p, key: `local:${projectId}`, id: projectId }
                  : p
              ),
            }));
          }
        }
      }

      if (!projectId) {
        projectId = crypto.randomUUID();
      }

      const result = await scanDirectory(dirHandle, (count, total) => updateProgress(count, total), {
        applyGitignore: gitignoreEnabled,
        onFileStart: (name) => set({ currentFile: name }),
      });
      completeScan({ name: result.name, files: result.files, tree: result.tree, source: { type: 'local' }, projectId });

      saveHandle(projectId, dirHandle);

      const key = `local:${projectId}`;
      addRecentProject({
        id: projectId,
        key,
        type: 'local',
        name: result.name,
        fileCount: result.files.length,
        totalTokens: result.files.reduce((sum, f) => sum + (f.tokens || 0), 0),
        openedAt: new Date().toISOString(),
      });

      return { ok: true, value: result };
    } catch (err) {
      if (err.name === 'AbortError') {
        set({ isScanning: false });
        return { ok: false, error: err, aborted: true };
      }
      console.error('Scan error:', err);
      failScan(err.message || 'Impossible de scanner ce dossier.');
      return { ok: false, error: err, aborted: false };
    }
  },

  resetProject: () => {
    const { sourceMeta, selectedPaths } = get();
    if (sourceMeta && selectedPaths.size > 0) {
      const pKey = stableProjectKey(sourceMeta, sourceMeta.projectId);
      set({ savedSelection: { projectKey: pKey, paths: [...selectedPaths] } });
    }
    set({
      projectName: '',
      projectLoaded: false,
      files: [],
      tree: null,
      sourceMeta: null,
      selectedPaths: new Set(),
      scanError: '',
      scanCount: 0,
      scanTotal: 0,
      isScanning: false,
      scanMode: 'local',
      currentFile: '',
    });
  },

  // Async orchestrators
  handleOpenLocal: async (dirHandle) => {
    const { scanFromHandle, failScan } = get();

    if (dirHandle?.kind === 'directory') {
      return await scanFromHandle(dirHandle);
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      return await scanFromHandle(handle);
    } catch (err) {
      if (err.name === 'AbortError') {
        set({ isScanning: false });
        return { ok: false, error: err, aborted: true };
      }
      failScan(err.message || "Impossible d'ouvrir ce dossier.");
      return { ok: false, error: err, aborted: false };
    }
  },

  /**
   * Re-open a local project from history.
   * Retrieves the stored handle, checks permission, rescans.
   */
  handleReopenLocal: async (project) => {
    try {
      const { scanFromHandle } = get();
      const projectId = project.id || project.key?.replace(/^local:/, '');

      if (!projectId || projectId === project.name) {
        return { ok: false, error: new Error('MISSING_HANDLE'), aborted: false };
      }

      const saved = await getHandle(projectId);
      if (!saved) {
        return { ok: false, error: new Error('MISSING_HANDLE'), aborted: false };
      }

      const opts = { mode: 'read' };
      let permission = await saved.queryPermission(opts);
      if (permission !== 'granted') {
        permission = await saved.requestPermission(opts);
      }

      if (permission !== 'granted') {
        return { ok: false, error: new Error('PERMISSION_DENIED'), aborted: false };
      }

      return await scanFromHandle(saved);
    } catch (err) {
      if (err.name === 'AbortError') {
        set({ isScanning: false });
        return { ok: false, error: err, aborted: true };
      }
      return { ok: false, error: err, aborted: false };
    }
  },

  /**
   * Refresh the currently open project without returning to the welcome screen.
   */
  handleRefresh: async () => {
    try {
      const { sourceMeta, scanFromHandle, handleOpenGitHub } = get();
    if (!sourceMeta) return { ok: false, error: new Error('No project loaded'), aborted: false };

    if (sourceMeta.type === 'github') {
      const src = sourceMeta;
      return await handleOpenGitHub({
        repoInput: src.input || `https://github.com/${src.owner}/${src.repo}`,
        ref: src.followDefaultBranch ? '' : src.requestedRef,
        subPath: src.subPath || '',
      });
    }

    // Local: re-scan using stored projectId from sourceMeta
    const projectId = sourceMeta.projectId;
    if (projectId) {
      const { getHandle: getH } = await import('./utils/handleStorage');
      const handle = await getH(projectId);
      if (handle) {
        const opts = { mode: 'read' };
        let perm = await handle.queryPermission(opts);
        if (perm !== 'granted') {
          perm = await handle.requestPermission(opts);
        }
        if (perm === 'granted') {
          return await scanFromHandle(handle);
        }
      }
    }
    const err = new Error("Impossible d'accéder au dossier. Réessayez depuis l'écran d'accueil.");
    return { ok: false, error: err, aborted: false };
    } catch (err) {
      if (err.name === 'AbortError') {
        set({ isScanning: false });
        return { ok: false, error: err, aborted: true };
      }
      return { ok: false, error: err, aborted: false };
    }
  },

  handleOpenGitHub: async ({ repoInput, ref = '', subPath = '' }) => {
    const {
      startScan,
      updateProgress,
      completeScan,
      failScan,
      addRecentProject,
      githubToken,
      gitignoreEnabled,
      tokenLimit,
      warningPercent,
      customThreshold,
    } = get();
    try {
      startScan('github');

      const result = await scanGitHubRepo({
        repoInput,
        ref,
        token: githubToken,
        applyGitignore: gitignoreEnabled,
        subPath,
        onEstimate: (estimate) => {
          const overPercent = estimate.estimatedTokens > (tokenLimit * warningPercent) / 100;
          const overCustom = customThreshold > 0 && estimate.estimatedTokens > customThreshold;
          if (!overPercent && !overCustom) return true;

          const summary = [
            'Le repository semble volumineux :',
            `- ${estimate.fileCount} fichiers texte`,
            `- ${estimate.totalBytes.toLocaleString('fr-FR')} bytes`,
            `- ~${estimate.estimatedTokens.toLocaleString('fr-FR')} tokens estimés`,
            '',
            'Continuer le chargement ?',
          ];
          return window.confirm(summary.join('\n'));
        },
        onFileStart: (name) => set({ currentFile: name }),
        onProgress: (current, total) => updateProgress(current, total),
      });

      completeScan({
        name: result.name,
        files: result.files,
        tree: result.tree,
        source: result.source || { type: 'github' },
      });

      const src = result.source || {};
      const logicalKey = githubLogicalKey(
        src.owner, src.repo, src.requestedRef, src.followDefaultBranch, src.subPath
      );

      addRecentProject({
        key: logicalKey,
        type: 'github',
        name: result.name,
        owner: src.owner,
        repo: src.repo,
        ref: result.resolvedRef || src.ref,
        requestedRef: src.requestedRef,
        followDefaultBranch: src.followDefaultBranch,
        subPath: src.subPath || '',
        input: src.input,
        resolvedSha: result.resolvedSha,
        fileCount: result.files.length,
        totalTokens: result.files.reduce((sum, f) => sum + (f.tokens || 0), 0),
        openedAt: new Date().toISOString(),
      });

      return { ok: true, value: result };
    } catch (err) {
      if (err.name === 'AbortError') {
        set({ isScanning: false });
        return { ok: false, error: err, aborted: true };
      }
      console.error('GitHub scan error:', err);
      failScan(err.message || 'Impossible de charger ce projet GitHub.');
      return { ok: false, error: err, aborted: false };
    }
  },
});

// ── Selection Slice ─────────────────────────────────────────
const createSelectionSlice = (set, get) => ({
  selectedPaths: new Set(),
  savedSelection: null,
  showWarning: false,
  pendingPaths: null,

  /**
   * Centralized selection request.
   * Only warns when the token count *increases* past the threshold.
   * Deselecting never triggers a popup.
   */
  requestSelection: (nextPaths) => {
    const { files, minifyEnabled, tokenLimit, warningPercent, customThreshold, selectedPaths } = get();
    const paths = nextPaths instanceof Set ? nextPaths : new Set(nextPaths);

    const currentTokens = calculateSelectionTokens(files, selectedPaths, minifyEnabled);
    const nextTokens = calculateSelectionTokens(files, paths, minifyEnabled);

    // Deselecting — always allow immediately
    if (nextTokens <= currentTokens) {
      set({ selectedPaths: paths });
      return;
    }

    // Tokens increased — check thresholds
    const overPercent = nextTokens > (tokenLimit * warningPercent) / 100;
    const overCustom = customThreshold > 0 && nextTokens > customThreshold;

    if (overPercent || overCustom) {
      set({ pendingPaths: paths, showWarning: true });
      return;
    }

    set({ selectedPaths: paths });
  },

  togglePath: (path) => {
    const next = new Set(get().selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    get().requestSelection(next);
  },

  toggleFolder: (folderPath) => {
    const state = get();
    const next = new Set(state.selectedPaths);
    const folderFiles = state.files.filter(
      (f) => f.path.startsWith(folderPath + '/') || f.path === folderPath
    );
    const allSelected = folderFiles.every((f) => next.has(f.path));
    folderFiles.forEach((f) => {
      if (allSelected) next.delete(f.path);
      else next.add(f.path);
    });
    get().requestSelection(next);
  },

  toggleExtension: (ext) => {
    const state = get();
    const next = new Set(state.selectedPaths);
    const extFiles = state.files.filter((f) => f.extension === ext);
    const allSelected = extFiles.every((f) => next.has(f.path));
    extFiles.forEach((f) => {
      if (allSelected) next.delete(f.path);
      else next.add(f.path);
    });
    get().requestSelection(next);
  },

  selectAll: () => {
    const { files } = get();
    const allPaths = new Set(files.map((f) => f.path));
    get().requestSelection(allPaths);
  },

  deselectAll: () => set({ selectedPaths: new Set() }),

  confirmWarning: () =>
    set((state) => ({
      selectedPaths: state.pendingPaths || state.selectedPaths,
      pendingPaths: null,
      showWarning: false,
    })),

  cancelWarning: () => set({ pendingPaths: null, showWarning: false }),

  selectRange: (fromPath, toPath, visiblePaths) => {
    const { selectedPaths, files } = get();
    // visiblePaths: ordered list as displayed in the tree (respects search & collapse).
    const paths = visiblePaths || files.map((f) => f.path);
    const idxA = paths.indexOf(fromPath);
    const idxB = paths.indexOf(toPath);
    if (idxA === -1 || idxB === -1) return;
    const start = Math.min(idxA, idxB);
    const end = Math.max(idxA, idxB);
    const next = new Set(selectedPaths);
    for (let i = start; i <= end; i++) {
      next.add(paths[i]);
    }
    get().requestSelection(next);
  },
});

// ── Settings Slice (persisted) ──────────────────────────────
const MAX_RECENT_PROJECTS = 10;

const createSettingsSlice = (set, get) => ({
  minifyEnabled: false,
  gitignoreEnabled: true,
  tokenLimit: 128_000,
  warningPercent: 40,
  customThreshold: 0,
  githubToken: '',
  recentProjects: [],
  sidebarCollapsed: false,
  sidebarWidth: 340,
  favoriteProjects: [],
  onboardingDone: false,

  setMinifyEnabled: (v) => {
    const state = get();
    const newVal = typeof v === 'function' ? v(state.minifyEnabled) : v;
    const previousTokens = calculateSelectionTokens(state.files, state.selectedPaths, state.minifyEnabled);
    set({ minifyEnabled: newVal });
    // Re-evaluate current selection against thresholds when minification changes
    const { selectedPaths, files } = get();
    if (selectedPaths.size > 0) {
      const nextTokens = calculateSelectionTokens(files, selectedPaths, newVal);
      const { tokenLimit, warningPercent, customThreshold } = get();
      const overPercent = nextTokens > (tokenLimit * warningPercent) / 100;
      const overCustom = customThreshold > 0 && nextTokens > customThreshold;
      if (nextTokens > previousTokens && (overPercent || overCustom)) {
        set({ pendingPaths: selectedPaths, showWarning: true });
      } else {
        set({ pendingPaths: null, showWarning: false });
      }
    }
  },
  setGitignoreEnabled: (v) =>
    set({ gitignoreEnabled: typeof v === 'function' ? v(get().gitignoreEnabled) : v }),
  setTokenLimit: (v) => {
    const newLimit = typeof v === 'function' ? v(get().tokenLimit) : v;
    set({ tokenLimit: newLimit });
    // Re-evaluate current selection when limit is lowered
    const { selectedPaths, files, minifyEnabled, warningPercent, customThreshold } = get();
    if (selectedPaths.size > 0) {
      const tokens = calculateSelectionTokens(files, selectedPaths, minifyEnabled);
      const overPercent = tokens > (newLimit * warningPercent) / 100;
      const overCustom = customThreshold > 0 && tokens > customThreshold;
      if (overPercent || overCustom) {
        set({ pendingPaths: selectedPaths, showWarning: true });
      } else {
        set({ pendingPaths: null, showWarning: false });
      }
    }
  },
  setWarningPercent: (v) => {
    const newPct = typeof v === 'function' ? v(get().warningPercent) : v;
    set({ warningPercent: newPct });
    // Re-evaluate
    const { selectedPaths, files, minifyEnabled, tokenLimit, customThreshold } = get();
    if (selectedPaths.size > 0) {
      const tokens = calculateSelectionTokens(files, selectedPaths, minifyEnabled);
      const overPercent = tokens > (tokenLimit * newPct) / 100;
      const overCustom = customThreshold > 0 && tokens > customThreshold;
      if (overPercent || overCustom) {
        set({ pendingPaths: selectedPaths, showWarning: true });
      } else {
        set({ pendingPaths: null, showWarning: false });
      }
    }
  },
  setCustomThreshold: (v) => {
    const newThresh = typeof v === 'function' ? v(get().customThreshold) : v;
    set({ customThreshold: newThresh });
    const { selectedPaths, files, minifyEnabled, tokenLimit, warningPercent } = get();
    if (selectedPaths.size > 0) {
      const tokens = calculateSelectionTokens(files, selectedPaths, minifyEnabled);
      const overPercent = tokens > (tokenLimit * warningPercent) / 100;
      const overCustom = newThresh > 0 && tokens > newThresh;
      if (overPercent || overCustom) {
        set({ pendingPaths: selectedPaths, showWarning: true });
      } else {
        set({ pendingPaths: null, showWarning: false });
      }
    }
  },
  setGithubToken: (v) =>
    set({ githubToken: typeof v === 'function' ? v(get().githubToken) : v }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, Math.min(600, w)) }),

  // Favorites
  toggleFavorite: (key) =>
    set((state) => {
      const favs = state.favoriteProjects || [];
      const exists = favs.includes(key);
      return {
        favoriteProjects: exists ? favs.filter((k) => k !== key) : [...favs, key],
      };
    }),

  setOnboardingDone: () => set({ onboardingDone: true }),

  addRecentProject: (project) =>
    set((state) => {
      const key = project.key || `${project.type}:${project.name}:${project.openedAt}`;
      const favSet = new Set(state.favoriteProjects || []);
      // Remove existing entry with same key, then prepend the new one
      const others = state.recentProjects.filter((p) => p.key !== key);
      const next = [{ ...project, key }, ...others];
      // Preserve all favorites; limit only non-favorites
      const favorites = next.filter((p) => favSet.has(p.key));
      const nonFavorites = next.filter((p) => !favSet.has(p.key));
      const cappedNonFavs = nonFavorites.slice(0, MAX_RECENT_PROJECTS);
      // Merge: favorites first (sorted by openedAt), then non-favorites
      const merged = [
        ...favorites.sort((a, b) => (b.openedAt ? new Date(b.openedAt).getTime() : 0) - (a.openedAt ? new Date(a.openedAt).getTime() : 0)),
        ...cappedNonFavs,
      ];
      return { recentProjects: merged };
    }),

  removeRecentProject: (key) =>
    set((state) => {
      // Also clean up IndexedDB handle for local projects
      const project = state.recentProjects.find((p) => p.key === key);
      if (project?.type === 'local' && project.id) {
        deleteHandle(project.id).catch(() => {});
      }
      return { recentProjects: state.recentProjects.filter((p) => p.key !== key) };
    }),

  loadGithubHistory: () => {
    try {
      const githubRepos = getRecentGitHubRepos();
      const seen = new Set();
      const entries = [];
      for (const item of githubRepos) {
        // Preserve the stored followDefaultBranch and requestedRef
        const followDefault = item.followDefaultBranch !== undefined
          ? item.followDefaultBranch
          : !item.ref;
        const requestedRef = item.requestedRef !== undefined
          ? item.requestedRef
          : (item.ref || '');
        const key = githubLogicalKey(
          item.owner, item.repo, requestedRef, followDefault, item.subPath
        );
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({
          key,
          type: 'github',
          name: `${item.owner}/${item.repo}${item.subPath ? `/${item.subPath}` : ''}`,
          owner: item.owner,
          repo: item.repo,
          ref: item.ref,
          requestedRef,
          followDefaultBranch: followDefault,
          subPath: item.subPath || '',
          input: item.input || `https://github.com/${item.owner}/${item.repo}`,
          fileCount: item.fileCount,
          resolvedSha: item.resolvedSha,
          openedAt: item.scannedAt || new Date().toISOString(),
        });
      }
      set((state) => {
        const favSet = new Set(state.favoriteProjects || []);
        const existingKeys = new Set(entries.map((e) => e.key));
        const existing = state.recentProjects.filter(
          (p) => p.type !== 'github' || !existingKeys.has(p.key)
        );
        const merged = [...entries, ...existing];
        const favorites = merged.filter((p) => favSet.has(p.key));
        const nonFavorites = merged.filter((p) => !favSet.has(p.key));
        const cappedNonFavs = nonFavorites.slice(0, MAX_RECENT_PROJECTS);
        return {
          recentProjects: [
            ...favorites.sort((a, b) => (b.openedAt ? new Date(b.openedAt).getTime() : 0) - (a.openedAt ? new Date(a.openedAt).getTime() : 0)),
            ...cappedNonFavs,
          ],
        };
      });
    } catch {
      // localStorage unavailable
    }
  },
});

// ── Store ───────────────────────────────────────────────────
export const useStore = create(
  persist(
    (...a) => ({
      ...createScanSlice(...a),
      ...createSelectionSlice(...a),
      ...createSettingsSlice(...a),
    }),
    {
      name: 'cp-store-settings',
      partialize: (state) => ({
        minifyEnabled: state.minifyEnabled,
        gitignoreEnabled: state.gitignoreEnabled,
        tokenLimit: state.tokenLimit,
        warningPercent: state.warningPercent,
        customThreshold: state.customThreshold,
        githubToken: state.githubToken,
        recentProjects: state.recentProjects,
        favoriteProjects: state.favoriteProjects,
        onboardingDone: state.onboardingDone,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);

// ── Selectors ───────────────────────────────────────────────
export const selectExtensions = (state) => {
  const countMap = {};
  state.files.forEach((file) => {
    if (!file.extension) return;
    countMap[file.extension] = (countMap[file.extension] || 0) + 1;
  });
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .map(([ext]) => ext);
};

export const selectSelectedFiles = (state) =>
  state.files
    .filter((file) => state.selectedPaths.has(file.path))
    .sort((a, b) => b.size - a.size);

export const selectStats = (state) => {
  const selected = state.files.filter((file) => state.selectedPaths.has(file.path));
  const totalTokens = selected.reduce(
    (sum, file) => sum + (state.minifyEnabled ? file.minifiedTokens : file.tokens),
    0
  );
  const totalSize = selected.reduce((sum, file) => sum + file.size, 0);
  const totalLines = selected.reduce((sum, file) => sum + (file.lines || 0), 0);
  return {
    totalTokens,
    totalSize,
    totalLines,
    fileCount: selected.length,
    totalFiles: state.files.length,
  };
};

export const selectOutputText = (state) => {
  const selected = selectSelectedFiles(state);
  if (selected.length === 0) return '';
  return generatePlainOutput(
    state.projectName,
    selected,
    selectStats(state).totalTokens,
    state.minifyEnabled,
    state.tree,
    state.selectedPaths
  );
};

export const selectHasProject = (state) => state.projectLoaded;

export const selectWarningTokens = (state) => {
  if (!state.pendingPaths) return 0;
  return state.files
    .filter((f) => state.pendingPaths.has(f.path))
    .reduce((sum, f) => sum + (state.minifyEnabled ? f.minifiedTokens : f.tokens), 0);
};
