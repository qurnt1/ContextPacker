import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FolderOpen,
  AlertTriangle,
  Github,
  ShieldCheck,
  History,
  Monitor,
  Upload,
  Star,
} from 'lucide-react';
import { useStore } from '../store';
import { getHandle } from '../utils/handleStorage';
import { listGitHubBranches } from '../utils/githubScanner';
import RecentProjectItem from './RecentProjectItem';
import BranchSelector from './BranchSelector';
import ContextPackerMark from './ContextPackerMark';

const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
const MAX_VISIBLE = 6;

export default function WelcomeScreen({ onShowOnboarding }) {
  const reduceMotion = useReducedMotion();
  const handleOpenLocal = useStore((s) => s.handleOpenLocal);
  const handleOpenGitHub = useStore((s) => s.handleOpenGitHub);
  const handleReopenLocal = useStore((s) => s.handleReopenLocal);
  const isScanning = useStore((s) => s.isScanning);
  const scanCount = useStore((s) => s.scanCount);
  const scanTotal = useStore((s) => s.scanTotal);
  const scanMode = useStore((s) => s.scanMode);
  const currentFile = useStore((s) => s.currentFile);
  const scanError = useStore((s) => s.scanError);
  const githubToken = useStore((s) => s.githubToken);
  const recentProjects = useStore((s) => s.recentProjects);
  const removeRecentProject = useStore((s) => s.removeRecentProject);
  const favoriteProjects = useStore((s) => s.favoriteProjects || []);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const [source, setSource] = useState('local');
  const [repoInput, setRepoInput] = useState('');
  const [subPath, setSubPath] = useState('');
  const subPathRef = useRef('');
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchError, setBranchError] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('');
  const branchAbortRef = useRef(null);
  const branchRequestIdRef = useRef(0);
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [openingKey, setOpeningKey] = useState(null);
  const [permissionItems, setPermissionItems] = useState(new Set());
  const [errorItem, setErrorItem] = useState(null);

  // Debounced branch loading when repoInput changes
  useEffect(() => {
    const requestId = ++branchRequestIdRef.current;
    // Abort previous request
    if (branchAbortRef.current) {
      branchAbortRef.current.abort();
      branchAbortRef.current = null;
    }

    if (!repoInput.trim() || source !== 'github') {
      setBranches([]);
      setBranchError('');
      setSelectedBranch('');
      setDefaultBranch('');
      setBranchesLoading(false);
      return;
    }

    // Basic validation: need at least owner/repo
    const trimmed = repoInput.trim();
    const hasSep = trimmed.includes('/') || trimmed.includes('github.com');
    if (!hasSep) {
      setBranches([]);
      setBranchError('');
      setBranchesLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      branchAbortRef.current = controller;
      setBranchesLoading(true);
      setBranchError('');
      try {
        const data = await listGitHubBranches({
          repoInput: trimmed,
          token: githubToken,
          signal: controller.signal,
        });
        // Check we weren't aborted or superseded
        if (controller.signal.aborted || requestId !== branchRequestIdRef.current) return;
        setBranches(data.branches);
        setDefaultBranch(data.defaultBranch);
        setSelectedBranch(data.inputRef || '');
        if (data.inputSubPath && !subPathRef.current.trim()) {
          setSubPath(data.inputSubPath);
          subPathRef.current = data.inputSubPath;
        }
      } catch (err) {
        if (err.name === 'AbortError' || requestId !== branchRequestIdRef.current) return;
        setBranchError(err.message || 'Erreur lors du chargement des branches.');
        setBranches([]);
      } finally {
        if (requestId === branchRequestIdRef.current) {
          setBranchesLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [repoInput, source, githubToken]);

  useEffect(() => {
    let cancelled = false;
    const checkPermissions = async () => {
      const needsPerm = new Set();
      for (const item of recentProjects) {
        if (cancelled) return;
        if (item.type !== 'local') continue;
        const projectId = item.id || item.key?.replace(/^local:/, '');
        if (!projectId || projectId === item.name) { needsPerm.add(item.key); continue; }
        try {
          const saved = await getHandle(projectId);
          if (cancelled) return;
          if (!saved) { needsPerm.add(item.key); continue; }
          try {
            if ((await saved.queryPermission({ mode: 'read' })) !== 'granted') {
              needsPerm.add(item.key);
            }
          } catch { needsPerm.add(item.key); }
        } catch { needsPerm.add(item.key); }
      }
      if (!cancelled) setPermissionItems(needsPerm);
    };
    checkPermissions();
    return () => { cancelled = true; };
  }, [recentProjects]);

  const loadingLabel = useMemo(() => {
    if (!isScanning) return '';
    if (scanMode === 'github') return scanTotal > 0 ? `Chargement GitHub... ${scanCount}/${scanTotal} fichiers` : 'Analyse GitHub en cours...';
    return `Analyse locale... ${scanCount} fichiers`;
  }, [isScanning, scanMode, scanCount, scanTotal]);

  const scanPercent = scanTotal > 0
    ? Math.min(100, Math.round((scanCount / scanTotal) * 100))
    : 0;

  const handleGitHubSubmit = async (event) => {
    event.preventDefault();
    if (!repoInput.trim() || branchesLoading) return;
    await handleOpenGitHub({ repoInput: repoInput.trim(), ref: selectedBranch, subPath: subPath.trim() });
  };

  const handleRecentOpen = useCallback(async (item) => {
    if (isScanning) return;
    setErrorItem(null);
    if (item.type === 'github') {
      setOpeningKey(item.key);
      setSource('github');
      setRepoInput(item.input || `https://github.com/${item.owner}/${item.repo}`);
      setSubPath(item.subPath || '');
      subPathRef.current = item.subPath || '';
      const result = await handleOpenGitHub({
        repoInput: item.input || `https://github.com/${item.owner}/${item.repo}`,
        ref: item.followDefaultBranch ? '' : item.requestedRef,
        subPath: item.subPath || '',
      });
      if (!result.ok && !result.aborted) {
        setErrorItem(item.key);
      }
      setOpeningKey(null);
      return;
    }
    setSource('local');
    setOpeningKey(item.key);
    const result = await handleReopenLocal(item);
    if (!result.ok) {
      if (result.error?.message === 'MISSING_HANDLE' || result.error?.message === 'PERMISSION_DENIED') {
        setPermissionItems((prev) => new Set([...prev, item.key]));
        setErrorItem(item.key);
      } else if (!result.aborted) {
        setErrorItem(item.key);
      }
    }
    setOpeningKey(null);
  }, [isScanning, handleOpenGitHub, handleReopenLocal]);

  const handleRelocate = useCallback(async (item) => {
    if (isScanning) return;
    setErrorItem(null);
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setOpeningKey(item.key);
      const result = await handleOpenLocal(handle);
      if (!result.ok) {
        if (!result.aborted) setErrorItem(item.key);
        return;
      }
      // Only remove the old entry after a successful re-scan
      removeRecentProject(item.key);
    } catch (err) { if (err.name !== 'AbortError') setErrorItem(item.key); }
    finally { setOpeningKey(null); }
  }, [isScanning, handleOpenLocal, removeRecentProject]);

  const handleDragEnter = (e) => { e.preventDefault(); if (e.currentTarget.contains(e.relatedTarget)) return; dragCounter.current++; setIsDragOver(true); };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDragLeave = (e) => { e.preventDefault(); if (e.currentTarget.contains(e.relatedTarget)) return; dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragOver(false); } };
  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragOver(false);
    try {
      for (const item of [...e.dataTransfer.items]) {
        if (item.kind !== 'file') continue;
        const handle = await item.getAsFileSystemHandle();
        if (handle?.kind === 'directory') { await handleOpenLocal(handle); return; }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('Échec du glisser-déposer.', error);
    }
    await handleOpenLocal();
  };

  // Separate and sort projects
  const { favorites, recents } = useMemo(() => {
    const favSet = new Set(favoriteProjects);
    const favs = [];
    const others = [];
    for (const p of recentProjects) {
      if (favSet.has(p.key)) favs.push(p);
      else others.push(p);
    }
    const sortFn = (a, b) => (b.openedAt ? new Date(b.openedAt).getTime() : 0) - (a.openedAt ? new Date(a.openedAt).getTime() : 0);
    favs.sort(sortFn);
    others.sort(sortFn);
    return { favorites: favs, recents: others };
  }, [recentProjects, favoriteProjects]);

  // Limit to MAX_VISIBLE, favorites first
  const { visibleFavorites, visibleRecents } = useMemo(() => {
    const visibleFavs = favorites.slice(0, MAX_VISIBLE);
    const remainingSlots = Math.max(0, MAX_VISIBLE - visibleFavs.length);
    const visibleRects = recents.slice(0, remainingSlots);
    return { visibleFavorites: visibleFavs, visibleRecents: visibleRects };
  }, [favorites, recents]);

  const hasHistory = visibleFavorites.length > 0 || visibleRecents.length > 0;

  return (
    <div className="welcome-shell flex-1 flex items-center justify-center relative overflow-hidden" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div className="welcome-atmosphere" aria-hidden="true">
        <motion.div
          className="welcome-orb welcome-orb-lime"
          initial={{ x: 0, y: 0, scale: 1, opacity: 0.65 }}
          animate={reduceMotion ? { x: 0, y: 0, scale: 1, opacity: 0.65 } : { x: [0, 96, -58, 0], y: [0, -62, 78, 0], scale: [1, 1.22, 0.88, 1], opacity: [0.4, 0.78, 0.42, 0.4] }}
          transition={reduceMotion ? undefined : { duration: 15, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="welcome-orb welcome-orb-teal"
          initial={{ x: 0, y: 0, scale: 1, opacity: 0.55 }}
          animate={reduceMotion ? { x: 0, y: 0, scale: 1, opacity: 0.55 } : { x: [0, -88, 62, 0], y: [0, 74, -56, 0], scale: [1, 0.84, 1.2, 1], opacity: [0.28, 0.68, 0.34, 0.28] }}
          transition={reduceMotion ? undefined : { duration: 18, ease: 'easeInOut', repeat: Infinity, delay: -6 }}
        />
        <motion.div
          className="welcome-orb welcome-orb-indigo"
          initial={{ x: 0, y: 0, scale: 1, opacity: 0.45 }}
          animate={reduceMotion ? { x: 0, y: 0, scale: 1, opacity: 0.45 } : { x: [0, 74, -82, 0], y: [0, 58, -48, 0], scale: [1, 1.24, 0.82, 1], opacity: [0.16, 0.5, 0.22, 0.16] }}
          transition={reduceMotion ? undefined : { duration: 13, ease: 'easeInOut', repeat: Infinity, delay: -4 }}
        />
      </div>
      <motion.div className="flex-1 flex items-center justify-center relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}>
        {isDragOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-cyber-accent/[0.04] backdrop-blur-sm">
            <div className="card px-8 py-6 text-center border-2 border-dashed border-cyber-accent/40">
              <Monitor className="w-10 h-10 text-cyber-accent mx-auto mb-3" />
              <p className="text-lg font-semibold text-cyber-text">Déposez le dossier ici</p>
              <p className="text-sm text-cyber-text-3 mt-1">Le scan démarrera automatiquement</p>
            </div>
          </div>
        )}

        <div className="welcome-content w-full max-w-4xl text-center z-10 px-6 py-8 md:py-12">
          {/* Logo */}
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="mb-6">
            <div className="welcome-mark inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-surface card mb-5">
              <ContextPackerMark className="w-8 h-8 text-cyber-accent" title="ContextPacker" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="welcome-title text-5xl sm:text-6xl font-bold mb-4">
            <span className="text-cyber-text">Context</span>
            <span className="text-cyber-accent">Packer</span>
          </motion.h1>

          {/* New explicit description */}
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.42, duration: 0.6 }} className="text-cyber-text-2 text-base sm:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Transformez un dossier local ou un dépôt GitHub en un contexte structuré prêt pour votre IA.
          </motion.p>

          {/* Main card */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }} className="welcome-card mx-auto w-full max-w-3xl card p-5 md:p-7 text-left">
            <div className="welcome-tabs flex gap-2 mb-6 pb-3">
              <button onClick={() => setSource('local')} disabled={isScanning} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${source === 'local' ? 'bg-cyber-accent text-black shadow-sm' : 'text-cyber-text-3 hover:text-cyber-text-2 hover:bg-cyber-surface-2'}`}>Projet local</button>
              <button onClick={() => setSource('github')} disabled={isScanning} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${source === 'github' ? 'bg-cyber-accent text-black shadow-sm' : 'text-cyber-text-3 hover:text-cyber-text-2 hover:bg-cyber-surface-2'}`}>Projet GitHub</button>
            </div>

            {isScanning ? (
              <>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-cyber-text-2">
                      {scanMode === 'github'
                        ? loadingLabel
                        : scanTotal > 0 ? 'Analyse locale...' : 'Préparation du scan...'}
                    </span>
                    <span className="font-mono text-cyber-accent tabular-nums">
                      {scanTotal > 0 ? `${scanCount}/${scanTotal} fichiers` : 'Comptage...'}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Progression de l’analyse"
                    aria-valuemin={0}
                    aria-valuemax={scanTotal || undefined}
                    aria-valuenow={scanTotal > 0 ? scanCount : undefined}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-cyber-surface-2 border border-cyber-border"
                  >
                    <motion.div
                      className="h-full rounded-full bg-cyber-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanPercent}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-cyber-text-3">
                    <span className="truncate pr-3">
                      {currentFile
                        ? `Lecture de ${currentFile}`
                        : scanTotal > 0 ? 'Analyse des fichiers...' : 'Exploration du dossier...'}
                    </span>
                    <span className="font-mono tabular-nums flex-shrink-0">{scanPercent}%</span>
                  </div>
                </div>
              </>
            ) : source === 'local' ? (
              <div className="space-y-3">
                {isSupported ? (
                  <button onClick={handleOpenLocal} disabled={isScanning} className="welcome-action w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-cyber-accent/10 border border-cyber-accent/25 text-cyber-accent font-semibold transition-all duration-200 hover:bg-cyber-accent/15 hover:border-cyber-accent/40 disabled:opacity-60 disabled:cursor-not-allowed">
                    <FolderOpen className="w-5 h-5" /><span>Ouvrir un dossier local</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-5 py-3 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-5 h-5" /><span className="text-sm font-medium">File System Access API non supportée par ce navigateur.</span>
                    </div>
                    <p className="text-cyber-text-3 text-sm">Utilisez Chrome, Edge ou un navigateur basé sur Chromium.</p>
                  </div>
                )}
                <div className="welcome-dropzone border border-dashed rounded-lg px-3 py-3 text-center">
                  <Upload className="w-4 h-4 inline mr-1.5 -mt-0.5 text-cyber-text-3" />
                  <span className="text-[11px] text-cyber-text-3">Glissez-déposez un dossier ici</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGitHubSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-cyber-text-3 uppercase tracking-wider font-semibold">URL GitHub ou owner/repo</label>
                  <input type="text" value={repoInput} onChange={(e) => setRepoInput(e.target.value)} disabled={isScanning} placeholder="https://github.com/owner/repo" className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/20 transition-colors placeholder:text-cyber-text-3/50" />
                </div>
                <div>
                  <label className="text-xs text-cyber-text-3 uppercase tracking-wider font-semibold">Branche</label>
                  <BranchSelector
                    branches={branches}
                    defaultBranch={defaultBranch}
                    selectedBranch={selectedBranch}
                    onChange={setSelectedBranch}
                    loading={branchesLoading}
                    error={branchError}
                  />
                  {branchError && branches.length === 0 ? (
                    <input
                      type="text"
                      value={selectedBranch}
                      onChange={(event) => setSelectedBranch(event.target.value)}
                      disabled={isScanning}
                      placeholder="Saisir une branche manuellement"
                      aria-label="Branche GitHub manuelle"
                      className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-accent/50"
                    />
                  ) : null}
                  {branchError ? <p className="mt-1 text-[10px] text-red-400">{branchError}</p> : null}
                </div>
                <div>
                  <label className="text-xs text-cyber-text-3 uppercase tracking-wider font-semibold">Sous-dossier (optionnel)</label>
                  <input type="text" value={subPath} onChange={(e) => { setSubPath(e.target.value); subPathRef.current = e.target.value; }} disabled={isScanning} placeholder="ex: src/components" className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/20 transition-colors placeholder:text-cyber-text-3/50" />
                </div>
                <button type="submit" disabled={isScanning || !repoInput.trim() || branchesLoading} className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-cyber-accent/10 border border-cyber-accent/25 text-cyber-accent font-semibold transition-all duration-200 hover:bg-cyber-accent/15 hover:border-cyber-accent/40 disabled:opacity-60 disabled:cursor-not-allowed">
                  <Github className="w-5 h-5" /><span>Charger le projet GitHub</span>
                </button>
                <p className="text-[11px] text-cyber-text-3 leading-relaxed">Repositories publics uniquement. Les projets récents sont mémorisés.</p>
              </form>
            )}

            {scanError ? (
              <div className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5">{scanError}</div>
            ) : null}
          </motion.div>

          {/* Error on specific item */}
          {errorItem && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-3xl mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-center">
              Impossible d'ouvrir ce projet. Vérifiez les permissions ou relocalisez le dossier.
            </motion.div>
          )}

          {/* Recent projects — favorites first, grid layout, max 6 */}
          {hasHistory && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.5 }} className="mx-auto w-full max-w-3xl mt-5">
              {/* Favorites section */}
              {visibleFavorites.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-2 font-semibold flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-400" />Favoris{favorites.length > MAX_VISIBLE ? ` (${visibleFavorites.length}/${favorites.length})` : ''}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {visibleFavorites.map((item) => (
                      <RecentProjectItem
                        key={item.key}
                        item={item}
                        onOpen={handleRecentOpen}
                        onDelete={removeRecentProject}
                        onRelocate={handleRelocate}
                        disabled={isScanning}
                        isOpening={openingKey === item.key}
                        needsPermission={permissionItems.has(item.key)}
                        isFavorite={true}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Recents section */}
              {visibleRecents.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-2 font-semibold flex items-center gap-1.5">
                    <History className="w-3 h-3" />{visibleFavorites.length > 0 ? 'Récents' : 'Projets récents'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                    {visibleRecents.map((item) => (
                      <RecentProjectItem
                        key={item.key}
                        item={item}
                        onOpen={handleRecentOpen}
                        onDelete={removeRecentProject}
                        onRelocate={handleRelocate}
                        disabled={isScanning}
                        isOpening={openingKey === item.key}
                        needsPermission={permissionItems.has(item.key)}
                        isFavorite={false}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Footer badges */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }} className="mt-8 flex items-center justify-center gap-6 text-xs text-cyber-text-3 font-medium">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-cyber-accent/60" />100% côté client</span>
            <span className="w-1 h-1 rounded-full bg-cyber-border" />
            <span>Aucun fichier envoyé</span>
            <span className="w-1 h-1 rounded-full bg-cyber-border" />
            <button type="button" data-testid="welcome-guide-button" onClick={onShowOnboarding} className="hover:text-cyber-accent transition-colors">Guide de démarrage</button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
