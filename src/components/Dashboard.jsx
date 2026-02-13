import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Hash, FileStack, AlignLeft, Clipboard, Download, Check, AlertTriangle } from 'lucide-react';
import { formatNumber } from '../utils/helpers';

export default function Dashboard({ stats, minifyEnabled, tokenLimit, outputText, projectName }) {
  const { totalTokens, fileCount, totalFiles, totalLines } = stats;
  const usage = totalTokens / tokenLimit;
  const isWarning = totalTokens > tokenLimit;
  const percentage = Math.min(usage * 100, 100);
  const [copied, setCopied] = useState(false);

  const limitLabel = tokenLimit >= 1_000_000
    ? `${(tokenLimit / 1_000_000).toFixed(tokenLimit % 1_000_000 === 0 ? 0 : 1)}M`
    : `${(tokenLimit / 1_000).toFixed(0)}K`;

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

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="h-16 border-t border-cyber-border bg-cyber-surface/90 backdrop-blur flex items-center px-4 md:px-6 gap-6 transition-colors duration-300 shadow-xl z-20"
    >
      {/* LEFT: Stats Group */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Hash className={`w-3.5 h-3.5 ${isWarning ? 'text-red-400' : 'text-cyber-cyan'}`} />
            <span className={`font-mono text-sm font-bold tabular-nums ${isWarning ? 'text-red-400' : 'text-cyber-text'}`}>
              {formatNumber(totalTokens)}
            </span>
          </div>
          <span className="text-[10px] text-cyber-text-3 font-medium uppercase tracking-wider">tokens</span>
        </div>

        <div className="w-px h-8 bg-cyber-border/50" />

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <FileStack className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono text-sm font-medium text-cyber-text-2 tabular-nums">
              {fileCount}
            </span>
          </div>
          <span className="text-[10px] text-cyber-text-3 font-medium uppercase tracking-wider">fichiers</span>
        </div>

        <div className="hidden sm:flex w-px h-8 bg-cyber-border/50" />

        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-sm font-medium text-cyber-text-2 tabular-nums">
              {formatNumber(totalLines)}
            </span>
          </div>
          <span className="text-[10px] text-cyber-text-3 font-medium uppercase tracking-wider">lignes</span>
        </div>
      </div>

      {/* CENTER: Progress Bar */}
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full px-4">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[10px] font-semibold text-cyber-text-3 uppercase tracking-wider">
            Contexte ({limitLabel})
          </span>
          {isWarning && (
             <div className="flex items-center gap-1 text-red-400 animate-pulse">
               <AlertTriangle className="w-3 h-3" />
               <span className="text-[10px] font-bold">OVERFLOW</span>
             </div>
          )}
          <span className={`font-mono text-[10px] ${isWarning ? 'text-red-400 font-bold' : 'text-cyber-cyan'}`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-cyber-surface-2 rounded-full overflow-hidden w-full relative">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_100%)] bg-[length:8px_8px]" />
          
          <motion.div
            className={`h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
              isWarning
                ? 'bg-gradient-to-r from-red-600 to-red-400'
                : 'bg-gradient-to-r from-cyber-cyan/60 to-cyber-cyan'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* RIGHT: Action Group */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleCopy}
          disabled={!outputText}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
              : 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 hover:bg-cyber-cyan/20 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Copier le résultat"
        >
          {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
          <span className="hidden lg:inline">{copied ? 'Copié !' : 'Copier'}</span>
        </button>

        <button
          onClick={handleDownload}
          disabled={!outputText}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Télécharger le fichier .txt"
        >
          <Download className="w-4 h-4" />
          <span className="hidden lg:inline">.TXT</span>
        </button>
      </div>
    </motion.div>
  );
}
