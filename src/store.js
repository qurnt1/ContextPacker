import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scanDirectory } from './utils/scanner';
import { generatePlainOutput } from './utils/outputFormatter';
import {
  deleteHandle,
  findMatchingHandle,
  getHandle,
  migrateOldHandle,
  saveHandle,
} from './utils/handleStorage';
import { isSelectableFile } from './utils/filePolicy';

const DEFAULT_TOKEN_LIMIT = 1_000_000;
const MAX_RECENT_PROJECTS = 10;
const FINALISATION_DELAY_MS = 500;

function waitForFinalisation(signal) {
  return new Promise((resolve, reject) => {
    let timeoutId;
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      const error = new Error('Analyse annulée.');
      error.name = 'AbortError';
      reject(error);
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, FINALISATION_DELAY_MS);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function stableProjectKey(projectId) {
  return `local:${projectId || ''}`;
}

function warningAcceptanceKey(state) {
  const projectKey = state.sourceMeta
    ? stableProjectKey(state.sourceMeta.projectId)
    : `local:${state.projectName || ''}`;
  return [projectKey, state.tokenLimit, state.warningPercent, state.minifyEnabled].join('|');
}

function normalizeTokenLimit(value, fallback = DEFAULT_TOKEN_LIMIT) {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? limit : fallback;
}

export function calculateSelectionTokens(files, paths, compactEnabled) {
  let sum = 0;
  for (const file of files) {
    if (!paths.has(file.path) || !isSelectableFile(file)) continue;
    sum += compactEnabled ? (file.minifiedTokens || 0) : (file.tokens || 0);
  }
  return sum;
}

export function isAboveWarningThreshold(tokens, tokenLimit, warningPercent) {
  return tokens > (tokenLimit * warningPercent) / 100;
}

function createScanSlice(set, get) {
  return {
    projectName: '',
    projectLoaded: false,
    files: [],
    tree: null,
    sourceMeta: null,
    isScanning: false,
    scanCount: 0,
    scanTotal: 0,
    scanError: '',
    currentFile: '',
    scanRequestId: 0,
    scanController: null,

    startScan: () => {
      get().scanController?.abort();
      const controller = new AbortController();
      const requestId = get().scanRequestId + 1;
      set({
        isScanning: true,
        scanCount: 0,
        scanTotal: 0,
        scanError: '',
        currentFile: '',
        scanRequestId: requestId,
        scanController: controller,
      });
      return { requestId, signal: controller.signal };
    },

    updateProgress: (count, total) =>
      set({ scanCount: count, scanTotal: total ?? get().scanTotal }),

    completeScan: ({ name, files, tree, projectId, scanRequestId }) => {
      const state = get();
      if (scanRequestId !== undefined && scanRequestId !== state.scanRequestId) return false;

      const projectKey = stableProjectKey(projectId);
      const currentKey = state.sourceMeta ? stableProjectKey(state.sourceMeta.projectId) : '';
      const sameProject = currentKey === projectKey;
      const canRestoreSaved = state.savedSelection?.projectKey === projectKey;
      const pathsToRestore = sameProject
        ? state.selectedPaths
        : (canRestoreSaved ? new Set(state.savedSelection.paths) : new Set());
      const validPaths = new Set(files.filter(isSelectableFile).map((file) => file.path));
      const selectedPaths = new Set([...pathsToRestore].filter((path) => validPaths.has(path)));

      set({
        projectName: name,
        projectLoaded: true,
        files,
        tree,
        sourceMeta: { type: 'local', projectId },
        isScanning: false,
        selectedPaths,
        scanError: '',
        scanCount: 0,
        scanTotal: 0,
        currentFile: '',
        scanController: null,
        savedSelection: sameProject || canRestoreSaved ? null : state.savedSelection,
        showWarning: false,
        pendingPaths: null,
        warningKind: null,
        warningAccepted: false,
        warningAcceptedKey: null,
      });
      return true;
    },

    failScan: (error) => set({ isScanning: false, scanError: error || 'Erreur inconnue.' }),

    scanFromHandle: async (dirHandle) => {
      const { startScan, updateProgress, completeScan, failScan, gitignoreEnabled, addRecentProject } = get();
      let scanRequestId;
      try {
        const scan = startScan();
        scanRequestId = scan.requestId;
        let projectId = await findMatchingHandle(dirHandle);

        if (!projectId) {
          const oldEntry = get().recentProjects.find(
            (project) => project.type === 'local'
              && project.name === dirHandle.name
              && /^local:[^a-f0-9-]/.test(project.key)
          );
          if (oldEntry) {
            projectId = crypto.randomUUID();
            const migratedHandle = await migrateOldHandle(dirHandle.name, projectId);
            if (migratedHandle) {
              set((state) => ({
                recentProjects: state.recentProjects.map((project) => (
                  project.key === oldEntry.key
                    ? { ...project, key: stableProjectKey(projectId), id: projectId }
                    : project
                )),
              }));
            }
          }
        }

        if (!projectId) projectId = crypto.randomUUID();

        const result = await scanDirectory(dirHandle, updateProgress, {
          applyGitignore: gitignoreEnabled,
          onFileStart: (name) => set({ currentFile: name }),
          signal: scan.signal,
        });
        const { scanTotal } = get();
        if (scanTotal > 0) await waitForFinalisation(scan.signal);
        const completed = completeScan({
          name: result.name,
          files: result.files,
          tree: result.tree,
          projectId,
          scanRequestId: scan.requestId,
        });
        if (!completed) return { ok: false, error: new Error('Scan remplacé.'), aborted: true };

        await saveHandle(projectId, dirHandle);
        addRecentProject({
          id: projectId,
          key: stableProjectKey(projectId),
          type: 'local',
          name: result.name,
          fileCount: result.files.length,
          totalTokens: result.files.reduce((sum, file) => sum + (file.tokens || 0), 0),
          openedAt: new Date().toISOString(),
        });
        return { ok: true, value: result };
      } catch (error) {
        if (scanRequestId !== undefined && get().scanRequestId !== scanRequestId) {
          return { ok: false, error, aborted: true };
        }
        if (error.name === 'AbortError') {
          if (get().scanRequestId === scanRequestId) set({ isScanning: false, scanController: null });
          return { ok: false, error, aborted: true };
        }
        console.error('Scan error:', error);
        failScan(error.message || 'Impossible de scanner ce dossier.');
        return { ok: false, error, aborted: false };
      }
    },

    resetProject: () => {
      const { sourceMeta, selectedPaths } = get();
      get().scanController?.abort();
      if (sourceMeta && selectedPaths.size > 0) {
        set({ savedSelection: { projectKey: stableProjectKey(sourceMeta.projectId), paths: [...selectedPaths] } });
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
        currentFile: '',
        scanController: null,
        showWarning: false,
        pendingPaths: null,
        warningKind: null,
        warningAccepted: false,
        warningAcceptedKey: null,
      });
    },

    handleOpenLocal: async (dirHandle) => {
      const { scanFromHandle, failScan } = get();
      if (dirHandle?.kind === 'directory') return scanFromHandle(dirHandle);
      try {
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        return await scanFromHandle(handle);
      } catch (error) {
        if (error.name === 'AbortError') {
          set({ isScanning: false });
          return { ok: false, error, aborted: true };
        }
        failScan(error.message || "Impossible d'ouvrir ce dossier.");
        return { ok: false, error, aborted: false };
      }
    },

    handleReopenLocal: async (project) => {
      try {
        const projectId = project.id || project.key?.replace(/^local:/, '');
        if (!projectId || projectId === project.name) {
          return { ok: false, error: new Error('MISSING_HANDLE'), aborted: false };
        }
        const handle = await getHandle(projectId);
        if (!handle) return { ok: false, error: new Error('MISSING_HANDLE'), aborted: false };

        const options = { mode: 'read' };
        let permission = await handle.queryPermission(options);
        if (permission !== 'granted') permission = await handle.requestPermission(options);
        if (permission !== 'granted') {
          return { ok: false, error: new Error('PERMISSION_DENIED'), aborted: false };
        }
        return await get().scanFromHandle(handle);
      } catch (error) {
        if (error.name === 'AbortError') {
          set({ isScanning: false });
          return { ok: false, error, aborted: true };
        }
        return { ok: false, error, aborted: false };
      }
    },

    handleRefresh: async () => {
      try {
        const { sourceMeta, scanFromHandle, files } = get();
        if (!sourceMeta) return { ok: false, error: new Error('No project loaded'), aborted: false };
        const previousFiles = files;
        const projectId = sourceMeta.projectId;
        if (projectId) {
          const handle = await getHandle(projectId);
          if (handle) {
            const options = { mode: 'read' };
            let permission = await handle.queryPermission(options);
            if (permission !== 'granted') permission = await handle.requestPermission(options);
            if (permission === 'granted') {
              const result = await scanFromHandle(handle);
              if (!result.ok) return result;
              const { createRefreshSummary } = await import('./utils/refreshDiff');
              return {
                ...result,
                refreshSummary: createRefreshSummary(previousFiles, result.value.files),
              };
            }
          }
        }
        return {
          ok: false,
          error: new Error("Impossible d'accéder au dossier. Réessayez depuis l'écran d'accueil."),
          aborted: false,
        };
      } catch (error) {
        if (error.name === 'AbortError') {
          set({ isScanning: false });
          return { ok: false, error, aborted: true };
        }
        return { ok: false, error, aborted: false };
      }
    },
  };
}

function createSelectionSlice(set, get) {
  return {
    selectedPaths: new Set(),
    savedSelection: null,
    showWarning: false,
    pendingPaths: null,
    warningKind: null,
    warningAccepted: false,
    warningAcceptedKey: null,

    requestSelection: (nextPaths) => {
      const { files, minifyEnabled, tokenLimit, warningPercent, selectedPaths, warningAccepted, warningAcceptedKey } = get();
      const requestedPaths = nextPaths instanceof Set ? nextPaths : new Set(nextPaths);
      const selectablePaths = new Set(files.filter(isSelectableFile).map((file) => file.path));
      const paths = new Set([...requestedPaths].filter((path) => selectablePaths.has(path)));
      const currentTokens = calculateSelectionTokens(files, selectedPaths, minifyEnabled);
      const nextTokens = calculateSelectionTokens(files, paths, minifyEnabled);

      if (nextTokens <= currentTokens) {
        set({ selectedPaths: paths, pendingPaths: null, showWarning: false, warningKind: null });
        return;
      }

      const acceptedForCurrentContext = warningAccepted && warningAcceptedKey === warningAcceptanceKey(get());
      if (isAboveWarningThreshold(nextTokens, tokenLimit, warningPercent) && !acceptedForCurrentContext) {
        set({ pendingPaths: paths, showWarning: true, warningKind: 'selection' });
        return;
      }
      set({ selectedPaths: paths, pendingPaths: null, showWarning: false, warningKind: null });
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
      const folderFiles = state.files.filter((file) => (
        isSelectableFile(file)
        && (file.path.startsWith(`${folderPath}/`) || file.path === folderPath)
      ));
      const allSelected = folderFiles.length > 0 && folderFiles.every((file) => next.has(file.path));
      folderFiles.forEach((file) => (allSelected ? next.delete(file.path) : next.add(file.path)));
      get().requestSelection(next);
    },

    toggleExtension: (extension) => {
      const state = get();
      const next = new Set(state.selectedPaths);
      const extensionFiles = state.files.filter((file) => isSelectableFile(file) && file.extension === extension);
      const allSelected = extensionFiles.length > 0 && extensionFiles.every((file) => next.has(file.path));
      extensionFiles.forEach((file) => (allSelected ? next.delete(file.path) : next.add(file.path)));
      get().requestSelection(next);
    },

    selectAll: () => get().requestSelection(new Set(get().files.filter(isSelectableFile).map((file) => file.path))),

    deselectAll: () => set({ selectedPaths: new Set(), pendingPaths: null, showWarning: false, warningKind: null }),

    confirmWarning: () => set((state) => ({
      selectedPaths: state.pendingPaths || state.selectedPaths,
      pendingPaths: null,
      showWarning: false,
      warningAccepted: true,
      warningAcceptedKey: warningAcceptanceKey(state),
      warningKind: null,
    })),

    cancelWarning: () => set({ pendingPaths: null, showWarning: false, warningKind: null }),

    selectRange: (fromPath, toPath, visiblePaths) => {
      const { selectedPaths, files } = get();
      const fileByPath = new Map(files.map((file) => [file.path, file]));
      const paths = visiblePaths || files.map((file) => file.path);
      const first = paths.indexOf(fromPath);
      const last = paths.indexOf(toPath);
      if (first === -1 || last === -1) return;
      const next = new Set(selectedPaths);
      for (let index = Math.min(first, last); index <= Math.max(first, last); index += 1) {
        if (isSelectableFile(fileByPath.get(paths[index]))) next.add(paths[index]);
      }
      get().requestSelection(next);
    },
  };
}

function createSettingsSlice(set, get) {
  return {
    minifyEnabled: false,
    gitignoreEnabled: true,
    tokenLimit: DEFAULT_TOKEN_LIMIT,
    warningPercent: 40,
    includeFullTreeInExport: true,
    recentProjects: [],
    sidebarCollapsed: false,
    sidebarWidth: 340,
    favoriteProjects: [],
    onboardingDone: false,

    setMinifyEnabled: (value) => {
      const state = get();
      const nextValue = typeof value === 'function' ? value(state.minifyEnabled) : value;
      const previousTokens = calculateSelectionTokens(state.files, state.selectedPaths, state.minifyEnabled);
      set({ minifyEnabled: Boolean(nextValue), warningAccepted: false, warningAcceptedKey: null });
      const nextTokens = calculateSelectionTokens(state.files, state.selectedPaths, Boolean(nextValue));
      if (nextTokens > previousTokens && isAboveWarningThreshold(nextTokens, state.tokenLimit, state.warningPercent)) {
        set({ pendingPaths: new Set(state.selectedPaths), showWarning: true, warningKind: 'settings' });
      } else {
        set({ pendingPaths: null, showWarning: false, warningKind: null });
      }
    },

    setGitignoreEnabled: async (value) => {
      const state = get();
      const nextValue = typeof value === 'function' ? value(state.gitignoreEnabled) : value;
      if (nextValue === state.gitignoreEnabled) return { ok: true, refreshed: false };
      if (state.isScanning) return { ok: false, error: new Error('SCAN_IN_PROGRESS'), aborted: false };
      set({ gitignoreEnabled: Boolean(nextValue) });
      if (!state.projectLoaded) return { ok: true, refreshed: false };
      return get().handleRefresh();
    },

    setTokenLimit: (value) => {
      const state = get();
      const nextLimit = normalizeTokenLimit(
        typeof value === 'function' ? value(state.tokenLimit) : value,
        state.tokenLimit
      );
      set({ tokenLimit: nextLimit, warningAccepted: false, warningAcceptedKey: null });
      const tokens = calculateSelectionTokens(state.files, state.selectedPaths, state.minifyEnabled);
      set(isAboveWarningThreshold(tokens, nextLimit, state.warningPercent)
        ? { pendingPaths: new Set(state.selectedPaths), showWarning: true, warningKind: 'settings' }
        : { pendingPaths: null, showWarning: false, warningKind: null });
    },

    setWarningPercent: (value) => {
      const state = get();
      const nextPercent = Math.min(100, Math.max(10, Number(
        typeof value === 'function' ? value(state.warningPercent) : value
      )));
      set({ warningPercent: nextPercent, warningAccepted: false, warningAcceptedKey: null });
      const tokens = calculateSelectionTokens(state.files, state.selectedPaths, state.minifyEnabled);
      set(isAboveWarningThreshold(tokens, state.tokenLimit, nextPercent)
        ? { pendingPaths: new Set(state.selectedPaths), showWarning: true, warningKind: 'settings' }
        : { pendingPaths: null, showWarning: false, warningKind: null });
    },

    setIncludeFullTreeInExport: (value) => set({
      includeFullTreeInExport: typeof value === 'function'
        ? value(get().includeFullTreeInExport)
        : value,
    }),

    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(600, width)) }),
    toggleFavorite: (key) => set((state) => {
      const favorites = state.favoriteProjects || [];
      return {
        favoriteProjects: favorites.includes(key)
          ? favorites.filter((favoriteKey) => favoriteKey !== key)
          : [...favorites, key],
      };
    }),
    setOnboardingDone: () => set({ onboardingDone: true }),

    addRecentProject: (project) => set((state) => {
      const key = project.key || `${project.type}:${project.name}:${project.openedAt}`;
      const favorites = new Set(state.favoriteProjects || []);
      const others = state.recentProjects.filter((item) => item.key !== key);
      const next = [{ ...project, key }, ...others];
      const favoriteItems = next.filter((item) => favorites.has(item.key));
      const recentItems = next.filter((item) => !favorites.has(item.key)).slice(0, MAX_RECENT_PROJECTS);
      return { recentProjects: [...favoriteItems, ...recentItems] };
    }),

    removeRecentProject: (key) => set((state) => {
      const project = state.recentProjects.find((item) => item.key === key);
      if (project?.type === 'local' && project.id) {
        deleteHandle(project.id).catch((error) => console.warn('Impossible de supprimer le handle local.', error));
      }
      return {
        recentProjects: state.recentProjects.filter((item) => item.key !== key),
        favoriteProjects: (state.favoriteProjects || []).filter((favoriteKey) => favoriteKey !== key),
      };
    }),
  };
}

export const useStore = create(
  persist(
    (...args) => ({
      ...createScanSlice(...args),
      ...createSelectionSlice(...args),
      ...createSettingsSlice(...args),
    }),
    {
      name: 'contextpacker-settings',
      version: 3,
      migrate: (persistedState) => ({
        ...persistedState,
        tokenLimit: normalizeTokenLimit(persistedState?.tokenLimit),
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        tokenLimit: normalizeTokenLimit(persistedState?.tokenLimit, currentState.tokenLimit),
      }),
      partialize: (state) => ({
        minifyEnabled: state.minifyEnabled,
        gitignoreEnabled: state.gitignoreEnabled,
        tokenLimit: state.tokenLimit,
        warningPercent: state.warningPercent,
        includeFullTreeInExport: state.includeFullTreeInExport,
        recentProjects: state.recentProjects,
        favoriteProjects: state.favoriteProjects,
        onboardingDone: state.onboardingDone,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);

export const selectExtensions = (state) => {
  const counts = {};
  state.files.filter(isSelectableFile).forEach((file) => {
    if (file.extension) counts[file.extension] = (counts[file.extension] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .map(([extension]) => extension);
};

export const selectSelectedFiles = (state) => state.files
  .filter((file) => isSelectableFile(file) && state.selectedPaths.has(file.path))
  .sort((left, right) => right.size - left.size);

export const selectStats = (state) => {
  const selected = selectSelectedFiles(state);
  const totalTokens = selected.reduce(
    (sum, file) => sum + (state.minifyEnabled ? file.minifiedTokens : file.tokens),
    0
  );
  return {
    totalTokens,
    totalSize: selected.reduce((sum, file) => sum + file.size, 0),
    totalLines: selected.reduce((sum, file) => sum + (file.lines || 0), 0),
    fileCount: selected.length,
    totalFiles: state.files.filter(isSelectableFile).length,
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
    state.selectedPaths,
    state.includeFullTreeInExport
  );
};

export const selectHasProject = (state) => state.projectLoaded;

export const selectWarningTokens = (state) => {
  if (!state.pendingPaths) return 0;
  return state.files
    .filter((file) => isSelectableFile(file) && state.pendingPaths.has(file.path))
    .reduce((sum, file) => sum + (state.minifyEnabled ? file.minifiedTokens : file.tokens), 0);
};
