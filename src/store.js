import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scanDirectory } from './utils/scanner';
import { scanGitHubRepo, getRecentGitHubRepos } from './utils/githubScanner';
import { generatePlainOutput } from './utils/outputFormatter';
import { saveHandle } from './utils/handleStorage';

// ── Scan Slice ──────────────────────────────────────────────
const createScanSlice = (set, get) => ({
  projectName: '',
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

  completeScan: ({ name, files, tree, source }) => {
    const saved = get().savedSelection;
    const restorePaths = saved && saved.projectKey === name
      ? new Set(saved.paths.filter(p => files.some(f => f.path === p)))
      : new Set();

    set({
      projectName: name,
      files,
      tree,
      sourceMeta: source || { type: get().scanMode },
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
      const result = await scanDirectory(dirHandle, (count) => updateProgress(count), {
        applyGitignore: gitignoreEnabled,
        onFileStart: (name) => set({ currentFile: name }),
      });
      completeScan({ name: result.name, files: result.files, tree: result.tree, source: { type: 'local' } });
      const key = `local:${result.name}`;
      saveHandle(key, dirHandle);
      addRecentProject({
        key,
        type: 'local',
        name: result.name,
        fileCount: result.files.length,
        totalTokens: result.files.reduce((sum, f) => sum + (f.tokens || 0), 0),
        openedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Scan error:', err);
        failScan(err.message || 'Impossible de scanner ce dossier.');
      } else {
        set({ isScanning: false });
      }
    }
  },

  resetProject: () => {
    const { projectName, selectedPaths } = get();
    // Save selection in memory for this project key
    if (projectName && selectedPaths.size > 0) {
      set({ savedSelection: { projectKey: projectName, paths: [...selectedPaths] } });
    }
    set({
      projectName: '',
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

    // Si un handle valide est fourni (depuis drag-drop) → scan direct, pas de picker
    if (dirHandle?.kind === 'directory') {
      await scanFromHandle(dirHandle);
      return;
    }

    // Sinon → picker système
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      await scanFromHandle(handle);
    } catch (err) {
      if (err.name === 'AbortError') {
        set({ isScanning: false });
      } else {
        failScan(err.message || "Impossible d'ouvrir ce dossier.");
      }
    }
  },

  handleOpenGitHub: async ({ repoInput, subPath = '' }) => {
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

      // Add to unified history
      addRecentProject({
        key: `github:${result.source?.owner}/${result.source?.repo}@${result.source?.ref}:${result.source?.subPath || ''}`,
        type: 'github',
        name: result.name,
        owner: result.source?.owner,
        repo: result.source?.repo,
        ref: result.source?.ref,
        subPath: result.source?.subPath || '',
        input: result.source?.input,
        fileCount: result.files.length,
        totalTokens: result.files.reduce((sum, f) => sum + (f.tokens || 0), 0),
        openedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('GitHub scan error:', err);
        failScan(err.message || 'Impossible de charger ce projet GitHub.');
      } else {
        set({ isScanning: false });
      }
    }
  },
});

// ── Selection Slice ─────────────────────────────────────────
const createSelectionSlice = (set, get) => ({
  selectedPaths: new Set(),
  savedSelection: null,
  showWarning: false,
  pendingPaths: null,

  togglePath: (path) =>
    set((state) => {
      const next = new Set(state.selectedPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { selectedPaths: next };
    }),

  toggleFolder: (folderPath) =>
    set((state) => {
      const next = new Set(state.selectedPaths);
      const folderFiles = state.files.filter(
        (f) => f.path.startsWith(folderPath + '/') || f.path === folderPath
      );
      const allSelected = folderFiles.every((f) => next.has(f.path));
      folderFiles.forEach((f) => {
        if (allSelected) next.delete(f.path);
        else next.add(f.path);
      });
      return { selectedPaths: next };
    }),

  toggleExtension: (ext) =>
    set((state) => {
      const next = new Set(state.selectedPaths);
      const extFiles = state.files.filter((f) => f.extension === ext);
      const allSelected = extFiles.every((f) => next.has(f.path));
      extFiles.forEach((f) => {
        if (allSelected) next.delete(f.path);
        else next.add(f.path);
      });
      return { selectedPaths: next };
    }),

  selectAll: () => {
    const { files, minifyEnabled, tokenLimit, warningPercent, customThreshold } = get();
    const allPaths = new Set(files.map((f) => f.path));

    const newTokens = files.reduce(
      (sum, f) => sum + (minifyEnabled ? f.minifiedTokens : f.tokens),
      0
    );
    const overPercent = newTokens > (tokenLimit * warningPercent) / 100;
    const overCustom = customThreshold > 0 && newTokens > customThreshold;

    if (overPercent || overCustom) {
      set({ pendingPaths: allPaths, showWarning: true });
      return;
    }

    set({ selectedPaths: allPaths });
  },

  deselectAll: () => set({ selectedPaths: new Set() }),

  confirmWarning: () =>
    set((state) => ({
      selectedPaths: state.pendingPaths || state.selectedPaths,
      pendingPaths: null,
      showWarning: false,
    })),

  cancelWarning: () => set({ pendingPaths: null, showWarning: false }),

  selectRange: (fromPath, toPath) =>
    set((state) => {
      const idxA = state.files.findIndex((f) => f.path === fromPath);
      const idxB = state.files.findIndex((f) => f.path === toPath);
      if (idxA === -1 || idxB === -1) return state;
      const start = Math.min(idxA, idxB);
      const end = Math.max(idxA, idxB);
      const next = new Set(state.selectedPaths);
      for (let i = start; i <= end; i++) {
        next.add(state.files[i].path);
      }
      return { selectedPaths: next };
    }),
});

// ── Settings Slice (persisted) ──────────────────────────────
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

  setMinifyEnabled: (v) => set({ minifyEnabled: typeof v === 'function' ? v(get().minifyEnabled) : v }),
  setGitignoreEnabled: (v) =>
    set({ gitignoreEnabled: typeof v === 'function' ? v(get().gitignoreEnabled) : v }),
  setTokenLimit: (v) => set({ tokenLimit: typeof v === 'function' ? v(get().tokenLimit) : v }),
  setWarningPercent: (v) =>
    set({ warningPercent: typeof v === 'function' ? v(get().warningPercent) : v }),
  setCustomThreshold: (v) =>
    set({ customThreshold: typeof v === 'function' ? v(get().customThreshold) : v }),
  setGithubToken: (v) =>
    set({ githubToken: typeof v === 'function' ? v(get().githubToken) : v }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, Math.min(600, w)) }),

  addRecentProject: (project) =>
    set((state) => {
      const key = project.key || `${project.type}:${project.name}:${project.openedAt}`;
      const filtered = state.recentProjects.filter((p) => p.key !== key);
      return { recentProjects: [{ ...project, key }, ...filtered].slice(0, 10) };
    }),

  removeRecentProject: (key) =>
    set((state) => ({
      recentProjects: state.recentProjects.filter((p) => p.key !== key),
    })),

  loadGithubHistory: () => {
    try {
      const githubRepos = getRecentGitHubRepos();
      const entries = githubRepos.map((item) => ({
        key: `github:${item.owner}/${item.repo}@${item.ref}:${item.subPath || ''}`,
        type: 'github',
        name: `${item.owner}/${item.repo}${item.subPath ? `/${item.subPath}` : ''}`,
        owner: item.owner,
        repo: item.repo,
        ref: item.ref,
        subPath: item.subPath || '',
        input: item.input || `https://github.com/${item.owner}/${item.repo}`,
        fileCount: item.fileCount,
        openedAt: item.scannedAt || new Date().toISOString(),
      }));
      set((state) => {
        const existing = state.recentProjects.filter((p) => p.type !== 'github');
        return { recentProjects: [...entries, ...existing].slice(0, 10) };
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
        sidebarCollapsed: state.sidebarCollapsed,
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

export const selectHasProject = (state) => state.files.length > 0;

export const selectWarningTokens = (state) => {
  if (!state.pendingPaths) return 0;
  return state.files
    .filter((f) => state.pendingPaths.has(f.path))
    .reduce((sum, f) => sum + (state.minifyEnabled ? f.minifiedTokens : f.tokens), 0);
};
