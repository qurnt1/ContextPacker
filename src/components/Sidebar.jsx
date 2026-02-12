import { motion } from 'framer-motion';
import {
  FolderOpen,
  CheckSquare,
  Square,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Package,
  Loader2,
} from 'lucide-react';
import FileTree from './FileTree';
import { formatNumber } from '../utils/helpers';

export default function Sidebar({
  projectName,
  tree,
  files,
  selectedPaths,
  extensions,
  minifyEnabled,
  stats,
  onTogglePath,
  onToggleFolder,
  onToggleExtension,
  onSelectAll,
  onDeselectAll,
  onToggleMinify,
  onOpenProject,
  isScanning,
}) {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-80 min-w-[320px] flex flex-col bg-cyber-surface border-r border-cyber-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-cyber-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-4 h-4 text-cyber-cyan flex-shrink-0" />
            <h2 className="font-semibold text-sm text-white truncate">{projectName}</h2>
          </div>
          <button
            onClick={onOpenProject}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg neon-border text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors disabled:opacity-50"
          >
            {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
            Ouvrir
          </button>
        </div>

        {/* Quick stats */}
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>
            <span className="text-gray-300 font-medium">{stats.fileCount}</span>/{stats.totalFiles} fichiers
          </span>
          <span className="text-gray-700">•</span>
          <span>
            <span className="text-gray-300 font-medium">{formatNumber(stats.totalTokens)}</span> tokens
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-cyber-border space-y-3">
        {/* Select All / Deselect All */}
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-cyber-surface-2 hover:bg-cyber-cyan/10 text-gray-300 hover:text-cyber-cyan transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Tout sélectionner
          </button>
          <button
            onClick={onDeselectAll}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-cyber-surface-2 hover:bg-red-500/10 text-gray-300 hover:text-red-400 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Tout désélectionner
          </button>
        </div>

        {/* Minification toggle */}
        <button
          onClick={onToggleMinify}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
            minifyEnabled
              ? 'bg-cyber-cyan/10 neon-border text-cyber-cyan'
              : 'bg-cyber-surface-2 text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            <Scissors className="w-3.5 h-3.5" />
            Minification
          </div>
          {minifyEnabled ? (
            <ToggleRight className="w-5 h-5 text-cyber-cyan" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Extension Filters */}
      <div className="px-4 py-3 border-b border-cyber-border">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Extensions</p>
        <div className="flex flex-wrap gap-1.5">
          {extensions.map((ext) => {
            const total = files.filter((f) => f.extension === ext).length;
            const selected = files.filter((f) => f.extension === ext && selectedPaths.has(f.path)).length;
            const allSelected = selected === total;
            const someSelected = selected > 0 && selected < total;

            return (
              <button
                key={ext}
                onClick={() => onToggleExtension(ext)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all duration-200 ${
                  allSelected
                    ? 'bg-cyber-cyan/20 text-cyber-cyan neon-border'
                    : someSelected
                      ? 'bg-cyber-cyan/10 text-cyber-cyan/70 border border-cyber-cyan/20'
                      : 'bg-cyber-surface-2 text-gray-500 border border-transparent hover:border-gray-700'
                }`}
              >
                <span>{ext || '(aucune)'}</span>
                <span className="text-[9px] opacity-60">
                  {selected}/{total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {tree && (
          <FileTree
            node={tree}
            files={files}
            selectedPaths={selectedPaths}
            onTogglePath={onTogglePath}
            onToggleFolder={onToggleFolder}
            minifyEnabled={minifyEnabled}
            depth={0}
            isRoot
          />
        )}
      </div>
    </motion.aside>
  );
}
