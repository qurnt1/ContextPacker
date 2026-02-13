import { motion } from 'framer-motion';
import { Zap, Moon, Sun, Monitor, FolderOpen, Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import SettingsPanel from './SettingsPanel';

export default function Header({
  onOpenProject,
  isScanning,
  tokenLimit,
  onChangeTokenLimit,
  warningPercent,
  onChangeWarningPercent,
  customThreshold,
  onChangeCustomThreshold,
}) {
  const { theme, setTheme, resolved } = useTheme();

  const cycleTheme = useCallback(() => {
    const order = ['system', 'dark', 'light'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  const ThemeIcon = theme === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;
  const themeLabel = theme === 'system' ? 'Système' : resolved === 'dark' ? 'Sombre' : 'Clair';

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-12 flex items-center justify-between px-4 border-b border-cyber-border bg-cyber-surface/80 backdrop-blur-sm z-50 flex-shrink-0"
    >
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20">
          <Zap className="w-4 h-4 text-cyber-cyan" />
        </div>
        <span className="text-sm font-bold tracking-tight">
          <span className="text-cyber-text">Context</span>
          <span className="text-cyber-cyan">Packer</span>
        </span>
        <span className="text-[10px] font-mono text-cyber-text-3 bg-cyber-surface-2 px-1.5 py-0.5 rounded">
          v2.2
        </span>
      </div>

      {/* Right: Open Project + Theme + Settings */}
      <div className="flex items-center gap-1.5">
        {/* Open Project */}
        <button
          onClick={onOpenProject}
          disabled={isScanning}
          title="Ouvrir un nouveau projet ou dossier"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg neon-border text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FolderOpen className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Ouvrir un projet</span>
        </button>

        <div className="w-px h-5 bg-cyber-border" />

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Thème: ${themeLabel}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors"
        >
          <ThemeIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Thème : {themeLabel}</span>
        </button>

        <div className="w-px h-5 bg-cyber-border" />

        {/* Settings */}
        <SettingsPanel
          tokenLimit={tokenLimit}
          onChangeTokenLimit={onChangeTokenLimit}
          warningPercent={warningPercent}
          onChangeWarningPercent={onChangeWarningPercent}
          customThreshold={customThreshold}
          onChangeCustomThreshold={onChangeCustomThreshold}
        />
      </div>
    </motion.header>
  );
}
