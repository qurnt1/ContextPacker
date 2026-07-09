import { motion } from 'framer-motion';
import { Zap, Moon, Sun, Monitor, FolderOpen, Loader2, Home, PanelLeftClose } from 'lucide-react';
import { useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useStore } from '../store';
import SettingsPanel from './SettingsPanel';

export default function Header() {
  const { theme, setTheme, resolved } = useTheme();
  const handleOpenLocal = useStore((s) => s.handleOpenLocal);
  const resetProject = useStore((s) => s.resetProject);
  const isScanning = useStore((s) => s.isScanning);
  const sourceMeta = useStore((s) => s.sourceMeta);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

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
      className="h-11 flex items-center justify-between px-4 border-b border-cyber-border bg-cyber-surface flex-shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleSidebar}
          title="Afficher/Masquer le panneau latéral"
          className="p-1.5 rounded-lg hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-accent transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
        <button
          onClick={resetProject}
          disabled={isScanning}
          title="Retour à l'écran d'accueil"
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-cyber-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyber-accent/10">
            <Zap className="w-3.5 h-3.5 text-cyber-accent" />
          </div>
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">
            <span className="text-cyber-text">Context</span>
            <span className="text-cyber-accent">Packer</span>
          </span>
        </button>
        <span className="text-[10px] font-mono text-cyber-text-3 bg-cyber-surface-2 px-1.5 py-0.5 rounded">
          v4.0
        </span>
        {sourceMeta ? (
          <span className="hidden md:inline text-[10px] font-mono text-cyber-text-3 bg-cyber-surface-2 px-1.5 py-0.5 rounded">
            {sourceLabel}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={resetProject}
          disabled={isScanning}
          title="Retour à la page d'accueil"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-accent hover:bg-cyber-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Accueil</span>
        </button>

        <button
          onClick={handleOpenLocal}
          disabled={isScanning}
          title="Ouvrir un dossier local"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-cyber-accent hover:bg-cyber-accent/10 border border-cyber-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FolderOpen className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Ouvrir local</span>
        </button>

        <button
          onClick={cycleTheme}
          title={`Thème: ${themeLabel}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-accent hover:bg-cyber-surface-2 transition-colors"
        >
          <ThemeIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{themeLabel}</span>
        </button>

        <SettingsPanel />
      </div>
    </motion.header>
  );
}
