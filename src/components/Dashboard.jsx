import { motion } from 'framer-motion';
import { Hash, FileStack, Scissors, AlertTriangle, BarChart3 } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import { TOKEN_WARNING_THRESHOLD } from '../constants';

export default function Dashboard({ stats, minifyEnabled }) {
  const { totalTokens, fileCount, totalFiles } = stats;
  const usage = totalTokens / TOKEN_WARNING_THRESHOLD;
  const isWarning = totalTokens > TOKEN_WARNING_THRESHOLD;
  const percentage = Math.min(usage * 100, 100);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="h-14 border-t border-cyber-border bg-cyber-surface/80 backdrop-blur flex items-center px-6 gap-6"
    >
      {/* Token count */}
      <div className="flex items-center gap-2">
        <Hash className={`w-3.5 h-3.5 ${isWarning ? 'text-red-400' : 'text-cyber-cyan'}`} />
        <span className={`font-mono text-sm font-semibold tabular-nums ${isWarning ? 'text-red-400' : 'text-white'}`}>
          {formatNumber(totalTokens)}
        </span>
        <span className="text-xs text-gray-500">tokens</span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-cyber-border" />

      {/* File count */}
      <div className="flex items-center gap-2">
        <FileStack className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-mono text-sm text-gray-300 tabular-nums">
          {fileCount}<span className="text-gray-600">/{totalFiles}</span>
        </span>
        <span className="text-xs text-gray-500">fichiers</span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-cyber-border" />

      {/* Minification */}
      <div className="flex items-center gap-2">
        <Scissors className={`w-3.5 h-3.5 ${minifyEnabled ? 'text-emerald-400' : 'text-gray-600'}`} />
        <span className={`text-xs font-medium ${minifyEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
          {minifyEnabled ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-cyber-border" />

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-3">
        <BarChart3 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <div className="flex-1 h-2 bg-cyber-surface-2 rounded-full overflow-hidden max-w-xs">
          <motion.div
            className={`h-full rounded-full ${
              isWarning
                ? 'bg-gradient-to-r from-red-500 to-red-400'
                : 'bg-gradient-to-r from-cyber-cyan/60 to-cyber-cyan'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="font-mono text-[10px] text-gray-500 tabular-nums flex-shrink-0">
          {percentage.toFixed(1)}% de 128K
        </span>
      </div>

      {/* Warning */}
      {isWarning && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-1.5 text-red-400 bg-red-400/10 px-3 py-1 rounded-lg"
        >
          <AlertTriangle className="w-3 h-3" />
          <span className="text-[10px] font-semibold">Dépassement contexte</span>
        </motion.div>
      )}
    </motion.div>
  );
}
