import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash, FileStack, AlignLeft, AlertTriangle } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import { isAboveWarningThreshold, useStore } from '../store';
import ExportMenu from './ExportMenu';
import LinearTokenProgress from './LinearTokenProgress';
import { isSelectionAllowed } from '../utils/securityPolicy';

export default function Dashboard() {
  const tokenLimit = useStore((s) => s.tokenLimit);
  const projectName = useStore((s) => s.projectName);
  const files = useStore((s) => s.files);
  const selectedPaths = useStore((s) => s.selectedPaths);
  const minifyEnabled = useStore((s) => s.minifyEnabled);
  const warningPercent = useStore((s) => s.warningPercent);
  const customThreshold = useStore((s) => s.customThreshold);
  const tree = useStore((s) => s.tree);
  const includeFullTreeInExport = useStore((s) => s.includeFullTreeInExport);
  const potentialSecretsAllowed = useStore((s) => s.potentialSecretsAllowed);

  const selectedFiles = useMemo(
    () =>
      files
        .filter((file) => isSelectionAllowed(file, potentialSecretsAllowed) && selectedPaths.has(file.path))
        .sort((a, b) => b.size - a.size),
    [files, selectedPaths, potentialSecretsAllowed]
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
      totalFiles: files.filter((file) => isSelectionAllowed(file, potentialSecretsAllowed)).length,
    };
  }, [selectedFiles, minifyEnabled, files, potentialSecretsAllowed]);

  const { totalTokens, fileCount, totalFiles, totalLines } = stats;
  const isWarning = isAboveWarningThreshold(totalTokens, tokenLimit, warningPercent, customThreshold);
  const isOverflow = totalTokens > tokenLimit;
  const percentage = tokenLimit > 0 ? (totalTokens / tokenLimit) * 100 : 0;

  const limitLabel =
    tokenLimit >= 1_000_000
      ? `${(tokenLimit / 1_000_000).toFixed(tokenLimit % 1_000_000 === 0 ? 0 : 1)}M`
      : `${(tokenLimit / 1_000).toFixed(0)}K`;

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="status-bar h-[58px] border-t border-cyber-border grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center px-4 md:px-5 gap-4 transition-colors duration-300 z-20 flex-shrink-0"
    >
      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2" title="Tokens de contenu (hors structure et métadonnées)">
          <Hash className={`w-3.5 h-3.5 ${isOverflow ? 'text-red-400' : 'text-cyber-accent'}`} />
          <span className={`font-mono text-sm font-bold tabular-nums ${isOverflow ? 'text-red-400' : 'text-cyber-text'}`}>
            {formatNumber(totalTokens)}
          </span>
          <span className="text-[10px] text-cyber-text-3 font-medium uppercase tracking-wider">tokens contenu</span>
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

      {/* Linear progress bar */}
      <div className="min-w-0 w-full max-w-lg justify-self-center flex items-center justify-center gap-3">
        <span className="text-[10px] font-semibold text-cyber-text-3 uppercase tracking-wider flex-shrink-0">
          {limitLabel}
        </span>
        <LinearTokenProgress current={totalTokens} limit={tokenLimit} isWarning={isWarning} warningPercent={warningPercent} />
        <span className={`text-[10px] font-mono font-bold tabular-nums flex-shrink-0 ${percentage > 100 ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-cyber-text-2'}`}>
          {percentage.toFixed(0)}%
        </span>
        {isOverflow && (
          <div className="flex items-center gap-1 text-red-400 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px] font-bold">OVERFLOW</span>
          </div>
        )}
      </div>

      {/* Export menu — generates output lazily on user action */}
      <ExportMenu
        projectName={projectName}
        selectedFiles={selectedFiles}
        tree={tree}
        selectedPaths={selectedPaths}
        minifyEnabled={minifyEnabled}
        contentTokens={totalTokens}
        tokenLimit={tokenLimit}
        includeFullTreeInExport={includeFullTreeInExport}
        disabled={files.filter((file) => isSelectionAllowed(file, potentialSecretsAllowed)).length === 0}
        potentialSecretsAllowed={potentialSecretsAllowed}
      />
    </motion.div>
  );
}
