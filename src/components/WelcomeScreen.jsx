import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Loader2,
  Zap,
  AlertTriangle,
  Github,
  ShieldCheck,
  History,
  Trash2,
  Monitor,
  Upload,
} from 'lucide-react';
import { useStore } from '../store';
import { getHandle } from '../utils/handleStorage';

const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export default function WelcomeScreen() {
  const handleOpenLocal = useStore((s) => s.handleOpenLocal);
  const handleOpenGitHub = useStore((s) => s.handleOpenGitHub);
  const isScanning = useStore((s) => s.isScanning);
  const scanCount = useStore((s) => s.scanCount);
  const scanTotal = useStore((s) => s.scanTotal);
  const scanMode = useStore((s) => s.scanMode);
  const currentFile = useStore((s) => s.currentFile);
  const scanError = useStore((s) => s.scanError);
  const recentProjects = useStore((s) => s.recentProjects);
  const removeRecentProject = useStore((s) => s.removeRecentProject);

  const [source, setSource] = useState('local');
  const [repoInput, setRepoInput] = useState('');
  const [subPath, setSubPath] = useState('');
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const loadingLabel = useMemo(() => {
    if (!isScanning) return '';
    if (scanMode === 'github') {
      if (scanTotal > 0) {
        return `Chargement GitHub... ${scanCount}/${scanTotal} fichiers`;
      }
      return 'Analyse GitHub en cours...';
    }
    return `Analyse locale... ${scanCount} fichiers`;
  }, [isScanning, scanMode, scanCount, scanTotal]);

  const handleGitHubSubmit = async (event) => {
    event.preventDefault();
    if (!repoInput.trim()) return;
    await handleOpenGitHub({
      repoInput: repoInput.trim(),
      subPath: subPath.trim(),
    });
  };

  const handleRecentClick = async (item) => {
    if (item.type === 'github') {
      setSource('github');
      setRepoInput(item.input || `https://github.com/${item.owner}/${item.repo}`);
      setSubPath(item.subPath || '');
      await handleOpenGitHub({
        repoInput: item.input || `https://github.com/${item.owner}/${item.repo}`,
        subPath: item.subPath || '',
      });
    } else {
      setSource('local');

      // Tenter de réutiliser le handle sauvegardé (IndexedDB)
      const saved = await getHandle(item.key);
      if (saved) {
        const opts = { mode: 'read' };
        // Fast path : permission déjà accordée (même session ou persistante Chrome 122+)
        if (await saved.queryPermission(opts) === 'granted') {
          await handleOpenLocal(saved);
          return;
        }
        // Demander la permission — appelé directement depuis le clic (transient activation OK)
        if (await saved.requestPermission(opts) === 'granted') {
          await handleOpenLocal(saved);
          return;
        }
      }

      // Fallback : picker (inévitable sans permission)
      await handleOpenLocal();
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    // Ignorer les entrées depuis un enfant (le dragLeave correspondant a été ignoré)
    if (e.currentTarget.contains(e.relatedTarget)) return;
    dragCounter.current++;
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Ignorer les sorties vers un enfant
    if (e.currentTarget.contains(e.relatedTarget)) return;
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);

    // Extraire un dossier du drop (le drop vaut autorisation de lecture)
    try {
      const items = [...e.dataTransfer.items];
      for (const item of items) {
        if (item.kind !== 'file') continue;
        const handle = await item.getAsFileSystemHandle();
        if (handle?.kind === 'directory') {
          // Scan direct du dossier deposé — pas de picker
          await handleOpenLocal(handle);
          return;
        }
      }
    } catch {
      // getAsFileSystemHandle non supporté ou erreur → fallback
    }
    // Fallback : ouvrir le picker classique
    await handleOpenLocal();
  };

  const formatRelative = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  };

  return (
    <div
      className="flex-1 flex items-center justify-center relative overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <motion.div
        className="flex-1 flex items-center justify-center relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5 }}
      >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-cyber-accent/[0.04] backdrop-blur-sm">
          <div className="card px-8 py-6 text-center border-2 border-dashed border-cyber-accent/40">
            <Monitor className="w-10 h-10 text-cyber-accent mx-auto mb-3" />
            <p className="text-lg font-semibold text-cyber-text">Déposez le dossier ici</p>
            <p className="text-sm text-cyber-text-3 mt-1">Le scan démarrera automatiquement</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl text-center z-10 px-6">
        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-cyber-surface card mb-5">
            <Zap className="w-8 h-8 text-cyber-accent" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-6xl font-bold tracking-tight mb-2"
        >
          <span className="text-cyber-text">Context</span>
          <span className="text-cyber-accent">Packer</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="text-xs font-mono text-cyber-text-3 mb-6"
        >
          v4.0
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="text-cyber-text-2 text-lg mb-10 max-w-xl mx-auto leading-relaxed"
        >
          Chargez un projet local ou un repository GitHub, puis assemblez un contexte propre
          pour vos LLM en quelques secondes.
        </motion.p>

        {/* Main card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mx-auto w-full max-w-2xl card p-5 md:p-6 text-left"
        >
          {/* Source tabs */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setSource('local')}
              disabled={isScanning}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                source === 'local'
                  ? 'bg-cyber-accent text-black shadow-sm'
                  : 'text-cyber-text-3 hover:text-cyber-text-2'
              }`}
            >
              Projet local
            </button>
            <button
              onClick={() => setSource('github')}
              disabled={isScanning}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                source === 'github'
                  ? 'bg-cyber-accent text-black shadow-sm'
                  : 'text-cyber-text-3 hover:text-cyber-text-2'
              }`}
            >
              Projet GitHub
            </button>
          </div>

          {isScanning ? (
            <>
              <div className="space-y-3 animate-pulse mb-4">
                <div className="h-4 bg-cyber-surface-2 rounded w-1/3" />
                <div className="h-10 bg-cyber-surface-2 rounded-lg w-full" />
                <div className="h-4 bg-cyber-surface-2 rounded w-1/4 mt-2" />
                <div className="h-10 bg-cyber-surface-2 rounded-lg w-full" />
              </div>
              <button
                disabled
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-cyber-accent/10 border border-cyber-accent/25 text-cyber-accent font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{loadingLabel}</span>
                  </div>
                  {currentFile && (
                    <p className="text-[10px] text-cyber-text-3 mt-1 truncate max-w-xs mx-auto">
                      {currentFile}
                    </p>
                  )}
                </div>
              </button>
            </>
          ) : source === 'local' ? (
            <div className="space-y-3">
              {isSupported ? (
                <button
                  onClick={handleOpenLocal}
                  disabled={isScanning}
                  className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-cyber-accent/10 border border-cyber-accent/25 text-cyber-accent font-semibold transition-all duration-200 hover:bg-cyber-accent/15 hover:border-cyber-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <>
                    <FolderOpen className="w-5 h-5" />
                    <span>Ouvrir un dossier local</span>
                  </>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-5 py-3 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      File System Access API non supportée par ce navigateur.
                    </span>
                  </div>
                  <p className="text-cyber-text-3 text-sm">
                    Utilisez Chrome, Edge ou un navigateur basé sur Chromium.
                  </p>
                </div>
              )}

              {/* Drag hint */}
              <div className="border border-dashed border-cyber-border rounded-lg px-3 py-2 text-center">
                <Upload className="w-4 h-4 inline mr-1.5 -mt-0.5 text-cyber-text-3" />
                <span className="text-[11px] text-cyber-text-3">Glissez-déposez un dossier ici</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGitHubSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-cyber-text-3 uppercase tracking-wider font-semibold">
                  URL GitHub ou owner/repo
                </label>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(event) => setRepoInput(event.target.value)}
                  disabled={isScanning}
                  placeholder="https://github.com/owner/repo"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/20 transition-colors placeholder:text-cyber-text-3/50"
                />
              </div>

              <div>
                <label className="text-xs text-cyber-text-3 uppercase tracking-wider font-semibold">
                  Sous-dossier (optionnel)
                </label>
                <input
                  type="text"
                  value={subPath}
                  onChange={(event) => setSubPath(event.target.value)}
                  disabled={isScanning}
                  placeholder="ex: src/components"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-accent/50 focus:ring-1 focus:ring-cyber-accent/20 transition-colors placeholder:text-cyber-text-3/50"
                />
              </div>

              <button
                type="submit"
                disabled={isScanning || !repoInput.trim()}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-cyber-accent/10 border border-cyber-accent/25 text-cyber-accent font-semibold transition-all duration-200 hover:bg-cyber-accent/15 hover:border-cyber-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <>
                  <Github className="w-5 h-5" />
                  <span>Charger le projet GitHub</span>
                </>
              </button>

              <p className="text-[11px] text-cyber-text-3 leading-relaxed">
                Repositories publics uniquement. Les projets récents sont mémorisés.
              </p>
            </form>
          )}

          {scanError ? (
            <div className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5">
              {scanError}
            </div>
          ) : null}
        </motion.div>

        {/* Recent projects */}
        {recentProjects.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="mx-auto w-full max-w-2xl mt-5"
          >
            <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-3 font-semibold flex items-center gap-1.5">
              <History className="w-3 h-3" />
              Projets récents
            </p>
            <div className="grid grid-cols-2 gap-2">
              {recentProjects.slice(0, 8).map((item) => (
                <div
                  key={item.key}
                  onClick={() => !isScanning && handleRecentClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isScanning) handleRecentClick(item); }}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left bg-cyber-surface/80 border border-cyber-border hover:border-cyber-accent/30 hover:bg-cyber-surface transition-all cursor-pointer ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.type === 'github' ? (
                      <Github className="w-4 h-4 text-cyber-text-3 flex-shrink-0" />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-cyber-text-3 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-cyber-text-2 truncate group-hover:text-cyber-accent transition-colors">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-cyber-text-3">
                        {item.fileCount ? `${item.fileCount} fichiers · ` : ''}{formatRelative(item.openedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentProject(item.key);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-red-400 transition-all flex-shrink-0 ml-1"
                    title="Retirer de l'historique"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {/* Footer badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-10 flex items-center justify-center gap-6 text-xs text-cyber-text-3 font-medium"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyber-accent/60" />
            100% côté client
          </span>
          <span className="w-1 h-1 rounded-full bg-cyber-border" />
          <span>Aucun fichier envoyé</span>
          <span className="w-1 h-1 rounded-full bg-cyber-border" />
          <span>Tiktoken o200k_base</span>
        </motion.div>
      </div>
      </motion.div>
    </div>
  );
}
