import { motion } from 'framer-motion';
import { Zap, Moon, Sun, Monitor, FolderOpen, Loader2, Home } from 'lucide-react';
import { useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import SettingsPanel from './SettingsPanel';

export default function Header({
  onOpenProject,
  onBackToWelcome,
  isScanning,
  sourceMeta,
  tokenLimit,
  onChangeTokenLimit,
  warningPercent,
  onChangeWarningPercent,
  customThreshold,
  onChangeCustomThreshold,
  githubToken,
  onChangeGithubToken,
}) {
  const { theme, setTheme, resolved } = useTheme();

  const cycleTheme = useCallback(() => {
    const order = ['system', 'dark', 'light'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  const ThemeIcon = theme === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;
  const themeLabel = theme === 'system' ? 'Système' : resolved === 'dark' ? 'Sombre' : 'Clair';
  const sourceLabel = sourceMeta?.type === 'github' ? 'GitHub' : 'Local';

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-12 flex items-center justify-between px-4 border-b border-cyber-border bg-cyber-surface/80 backdrop-blur-sm z-50 flex-shrink-0"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onBackToWelcome}
          disabled={isScanning}
          title="Retour à l’écran principal"
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-cyber-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyber-accent/10 border border-cyber-accent/20">
            <Zap className="w-4 h-4 text-cyber-accent" />
          </div>
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">
            <span className="text-cyber-text">Context</span>
            <span className="text-cyber-accent">Packer</span>
          </span>
        </button>
        <span className="text-[10px] font-mono text-cyber-text-3 bg-cyber-surface-2 px-1.5 py-0.5 rounded">
          v3.0
        </span>
        <span className="hidden md:inline text-[10px] font-mono text-cyber-text-3 bg-cyber-surface-2 px-1.5 py-0.5 rounded border border-cyber-border">
          source: {sourceLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onBackToWelcome}
          disabled={isScanning}
          title="Retour à la page d’accueil"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-accent hover:bg-cyber-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Accueil</span>
        </button>

        <div className="w-px h-5 bg-cyber-border" />

        <button
          onClick={onOpenProject}
          disabled={isScanning}
          title="Ouvrir un nouveau projet ou dossier local"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg neon-border text-cyber-accent hover:bg-cyber-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FolderOpen className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Ouvrir local</span>
        </button>

        <div className="w-px h-5 bg-cyber-border" />

        <button
          onClick={cycleTheme}
          title={`Thème: ${themeLabel}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-accent hover:bg-cyber-accent/10 transition-colors"
        >
          <ThemeIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Thème : {themeLabel}</span>
        </button>

        <div className="w-px h-5 bg-cyber-border" />

        <SettingsPanel
          tokenLimit={tokenLimit}
          onChangeTokenLimit={onChangeTokenLimit}
          warningPercent={warningPercent}
          onChangeWarningPercent={onChangeWarningPercent}
          customThreshold={customThreshold}
          onChangeCustomThreshold={onChangeCustomThreshold}
          githubToken={githubToken}
          onChangeGithubToken={onChangeGithubToken}
        />
      </div>
    </motion.header>
  );
}
