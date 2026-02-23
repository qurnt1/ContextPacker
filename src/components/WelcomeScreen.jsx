import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Loader2,
  Zap,
  AlertTriangle,
  Github,
  ShieldCheck,
  History,
} from 'lucide-react';

const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export default function WelcomeScreen({
  onOpenLocal,
  onOpenGitHub,
  isScanning,
  scanCount,
  scanTotal,
  scanMode,
  scanError,
  githubToken,
  onChangeGithubToken,
  recentGitHubRepos,
}) {
  const [source, setSource] = useState('local');
  const [repoInput, setRepoInput] = useState('');
  const [subPath, setSubPath] = useState('');

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
    await onOpenGitHub({
      repoInput: repoInput.trim(),
      subPath: subPath.trim(),
    });
  };

  const handleRecentClick = async (item) => {
    setSource('github');
    setRepoInput(item.input || `https://github.com/${item.owner}/${item.repo}`);
    setSubPath(item.subPath || '');
    await onOpenGitHub({
      repoInput: item.input || `https://github.com/${item.owner}/${item.repo}`,
      subPath: item.subPath || '',
    });
  };

  return (
    <motion.div
      className="flex-1 flex items-center justify-center grid-bg radial-glow relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent" />
        <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-cyber-cyan/10 to-transparent" />
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-cyber-cyan/10 to-transparent" />
      </div>

      <div className="w-full max-w-3xl text-center z-10 px-6">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyber-surface neon-border mb-6 animate-pulse-glow">
            <Zap className="w-10 h-10 text-cyber-cyan" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl font-bold tracking-tight mb-1"
        >
          <span className="text-cyber-text">Context</span>
          <span className="text-cyber-cyan text-glow-cyan">Packer</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="text-xs font-mono text-cyber-text-2 mb-5"
        >
          v3.0
        </motion.p>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="text-cyber-text-2 text-lg mb-8 max-w-xl mx-auto leading-relaxed"
        >
          Chargez un projet local ou un repository GitHub public, puis assemblez un contexte propre
          pour vos LLM en quelques secondes.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mx-auto w-full max-w-2xl rounded-2xl bg-cyber-surface/85 border border-cyber-border p-4 md:p-5 text-left"
        >
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSource('local')}
              disabled={isScanning}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                source === 'local'
                  ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30'
                  : 'bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text-2'
              }`}
            >
              Projet local
            </button>
            <button
              onClick={() => setSource('github')}
              disabled={isScanning}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                source === 'github'
                  ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30'
                  : 'bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text-2'
              }`}
            >
              Projet GitHub
            </button>
          </div>

          {source === 'local' ? (
            <div className="space-y-3">
              {isSupported ? (
                <button
                  onClick={onOpenLocal}
                  disabled={isScanning}
                  className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-cyber-surface neon-border-bright text-cyber-cyan font-semibold transition-all duration-300 hover:bg-cyber-surface-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isScanning && scanMode === 'local' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{loadingLabel}</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-5 h-5" />
                      <span>Ouvrir un nouveau projet ou dossier</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-5 py-3 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      File System Access API non supportee par ce navigateur.
                    </span>
                  </div>
                  <p className="text-cyber-text-3 text-sm">
                    Utilisez Chrome, Edge ou un navigateur base sur Chromium.
                  </p>
                </div>
              )}
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
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-cyan/50"
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
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-cyan/50"
                />
              </div>

              <div>
                <label className="text-xs text-cyber-text-3 uppercase tracking-wider font-semibold">
                  Token GitHub (optionnel)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(event) => onChangeGithubToken(event.target.value)}
                  disabled={isScanning}
                  placeholder="ghp_... (ameliore le rate limit)"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-cyber-surface-2 border border-cyber-border text-cyber-text text-sm focus:outline-none focus:border-cyber-cyan/50"
                />
              </div>

              <button
                type="submit"
                disabled={isScanning || !repoInput.trim()}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-cyber-surface neon-border-bright text-cyber-cyan font-semibold transition-all duration-300 hover:bg-cyber-surface-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isScanning && scanMode === 'github' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{loadingLabel}</span>
                  </>
                ) : (
                  <>
                    <Github className="w-5 h-5" />
                    <span>Charger le projet GitHub</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-cyber-text-3 leading-relaxed">
                Version v3: repositories publics uniquement. Les repos recents sont memorises pour
                accelerer vos imports.
              </p>
            </form>
          )}

          {scanError ? (
            <div className="mt-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {scanError}
            </div>
          ) : null}

          {recentGitHubRepos?.length > 0 ? (
            <div className="mt-4 border-t border-cyber-border pt-3">
              <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-2 font-semibold flex items-center gap-1.5">
                <History className="w-3 h-3" />
                Repositories recents
              </p>
              <div className="flex flex-wrap gap-2">
                {recentGitHubRepos.slice(0, 6).map((item) => (
                  <button
                    key={`${item.owner}/${item.repo}@${item.ref}:${item.subPath || ''}`}
                    onClick={() => handleRecentClick(item)}
                    disabled={isScanning}
                    className="px-2.5 py-1 rounded text-[11px] font-mono bg-cyber-surface-2 hover:bg-cyber-cyan/10 text-cyber-text-2 hover:text-cyber-cyan border border-transparent hover:border-cyber-cyan/20 transition-colors"
                    title={item.subPath ? `${item.owner}/${item.repo} (${item.subPath})` : `${item.owner}/${item.repo}`}
                  >
                    {item.owner}/{item.repo}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-8 flex items-center justify-center gap-6 text-xs text-cyber-text-2 font-medium"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan/80" />
            100% cote client
          </span>
          <span className="w-1 h-1 rounded-full bg-cyber-cyan/30" />
          <span>Aucun fichier envoye</span>
          <span className="w-1 h-1 rounded-full bg-cyber-cyan/30" />
          <span>Tiktoken o200k_base</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
