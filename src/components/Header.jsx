import { motion } from 'framer-motion';
import { Zap, Moon, Sun, Monitor, Download, Clipboard, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';

export default function Header({ outputText, projectName }) {
  const { theme, setTheme, resolved } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [outputText]);

  const handleDownload = useCallback(() => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'context'}-packed.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [outputText, projectName]);

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
          v2.0
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Thème: ${themeLabel}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors"
        >
          <ThemeIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{themeLabel}</span>
        </button>

        <div className="w-px h-5 bg-cyber-border" />

        {/* Copy */}
        <button
          onClick={handleCopy}
          disabled={!outputText}
          title="Copier dans le presse-papier"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            copied
              ? 'text-emerald-400 bg-emerald-400/10'
              : 'text-cyber-text-2 hover:text-cyber-cyan hover:bg-cyber-cyan/10'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={!outputText}
          title="Télécharger .txt"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Télécharger</span>
        </button>
      </div>
    </motion.header>
  );
}
