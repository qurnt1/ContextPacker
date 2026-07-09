import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash, FileStack, AlignLeft, Clipboard, Download, Check, AlertTriangle } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import { useStore } from '../store';
import { generatePlainOutput } from '../utils/outputFormatter';
import { generateMarkdownOutput } from '../utils/markdownFormatter';

export default function Dashboard() {
  const tokenLimit = useStore((s) => s.tokenLimit);
  const projectName = useStore((s) => s.projectName);
  const files = useStore((s) => s.files);
  const selectedPaths = useStore((s) => s.selectedPaths);
  const minifyEnabled = useStore((s) => s.minifyEnabled);
  const tree = useStore((s) => s.tree);

  // Compute derived data with useMemo
  const selectedFiles = useMemo(
    () =>
      files
        .filter((file) => selectedPaths.has(file.path))
        .sort((a, b) => b.size - a.size),
    [files, selectedPaths]
  );

  const stats = useMemo(() => {
    const totalTokens = selectedFiles.reduce(
      (sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens),
      0
    );
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const totalLines = selectedFiles.reduce((sum, file) => sum + (file.lines || 0), 0);
    return {
      totalTokens,
      totalSize,
      totalLines,
      fileCount: selectedFiles.length,
      totalFiles: files.length,
    };
  }, [selectedFiles, minifyEnabled, files.length]);

  const outputText = useMemo(() => {
    if (selectedFiles.length === 0) return '';
    return generatePlainOutput(
      projectName,
      selectedFiles,
      stats.totalTokens,
      minifyEnabled,
      tree,
      selectedPaths
    );
  }, [projectName, selectedFiles, stats.totalTokens, minifyEnabled, tree, selectedPaths]);

  const markdownOutput = useMemo(() => {
    if (selectedFiles.length === 0) return '';
    return generateMarkdownOutput(
      projectName,
      selectedFiles,
      stats.totalTokens,
      minifyEnabled,
      tree,
      selectedPaths
    );
  }, [projectName, selectedFiles, stats.totalTokens, minifyEnabled, tree, selectedPaths]);

  const handleDownloadMD = useCallback(() => {
    if (!markdownOutput) return;
    const blob = new Blob([markdownOutput], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'context'}-packed.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdownOutput, projectName]);

  const { totalTokens, fileCount, totalFiles, totalLines } = stats;
  const usage = totalTokens / tokenLimit;
  const isWarning = totalTokens > tokenLimit;
  const percentage = Math.min(usage * 100, 100);
  const [copied, setCopied] = useState(false);

  const limitLabel =
    tokenLimit >= 1_000_000
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
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="h-[52px] border-t border-cyber-border bg-cyber-surface flex items-center px-4 md:px-5 gap-5 transition-colors duration-300 z-20 flex-shrink-0"
    >
      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Hash className={`w-3.5 h-3.5 ${isWarning ? 'text-red-400' : 'text-cyber-accent'}`} />
          <span className={`font-mono text-sm font-bold tabular-nums ${isWarning ? 'text-red-400' : 'text-cyber-text'}`}>
            {formatNumber(totalTokens)}
          </span>
          <span className="text-[10px] text-cyber-text-3 font-medium uppercase tracking-wider">tokens</span>
        </div>

        <div className="w-px h-5 bg-cyber-border/50" />

        <div className="flex items-center gap-2">
          <FileStack className="w-3.5 h-3.5 text-cyber-text-2" />
          <span className="font-mono text-sm font-medium text-cyber-text-2 tabular-nums">
            {fileCount}/{totalFiles}
          </span>
          <span className="text-[10px] text-cyber-text-3 font-medium uppercase tracking-wider">fichiers</span>
        </div>

        <div className="hidden sm:flex w-px h-5 bg-cyber-border/50" />

        <div className="hidden sm:flex items-center gap-2">
          <AlignLeft className="w-3.5 h-3.5 text-cyber-text-2" />
          <span className="font-mono text-sm font-medium text-cyber-text-2 tabular-nums">
            {formatNumber(totalLines)}
          </span>
          <span className="text-[10px] text-cyber-text-3 font-medium uppercase tracking-wider">lignes</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
        <div className="flex justify-between items-end mb-1">
          <span className="text-[10px] font-semibold text-cyber-text-3 uppercase tracking-wider">
            {limitLabel}
          </span>
          {isWarning ? (
            <div className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] font-bold">OVERFLOW</span>
            </div>
          ) : null}
          <span className={`font-mono text-[10px] ${isWarning ? 'text-red-400 font-bold' : 'text-cyber-text-3'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 bg-cyber-surface-2 rounded-full overflow-hidden w-full">
          <motion.div
            className={`h-full rounded-full transition-colors ${
              isWarning ? 'bg-red-500' : 'bg-cyber-accent'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleCopy}
          disabled={!outputText}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all ${
            copied
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/25 hover:bg-cyber-accent/15'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title="Copier le résultat"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">{copied ? 'Copié' : 'Copier'}</span>
        </button>

        <button
          onClick={handleDownload}
          disabled={!outputText}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-cyber-surface-2 text-cyber-text-2 border border-cyber-border hover:border-cyber-accent/30 hover:text-cyber-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Télécharger en .txt"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">.TXT</span>
        </button>

        <button
          onClick={handleDownloadMD}
          disabled={!markdownOutput}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/25 hover:bg-cyber-accent/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Télécharger en .md (Markdown avec blocs de code)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">.MD</span>
        </button>
      </div>
    </motion.div>
  );
}
