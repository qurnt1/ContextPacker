import { motion } from 'framer-motion';
import {
  CheckSquare,
  Square,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Package,
  GitBranch,
  Info,
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
  gitignoreEnabled,
  stats,
  onTogglePath,
  onToggleFolder,
  onToggleExtension,
  onSelectAll,
  onDeselectAll,
  onToggleMinify,
  onToggleGitignore,
}) {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-[370px] min-w-[370px] flex flex-col bg-cyber-surface border-r border-cyber-border overflow-hidden transition-colors duration-300"
    >
      {/* Header */}
      <div className="p-4 border-b border-cyber-border">
        <div className="flex items-center gap-2 min-w-0 mb-3">
          <Package className="w-4 h-4 text-cyber-cyan flex-shrink-0" />
          <h2 className="font-semibold text-sm text-cyber-text truncate">{projectName}</h2>
        </div>

        {/* Quick stats */}
        <div className="text-xs text-cyber-text-3 flex items-center gap-3 flex-wrap">
          <span>
            <span className="text-cyber-text-2 font-medium">{stats.fileCount}</span>/{stats.totalFiles} fichiers
          </span>
          <span className="text-cyber-border">•</span>
          <span>
            <span className="text-cyber-text-2 font-medium">{formatNumber(stats.totalTokens)}</span> tokens
          </span>
          <span className="text-cyber-border">•</span>
          <span>
            <span className="text-cyber-text-2 font-medium">{formatNumber(stats.totalLines)}</span> lignes
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-cyber-border space-y-2.5">
        {/* Select All / Deselect All */}
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-cyber-surface-2 hover:bg-cyber-cyan/10 text-cyber-text-2 hover:text-cyber-cyan transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Tout sélectionner
          </button>
          <button
            onClick={onDeselectAll}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-cyber-surface-2 hover:bg-red-500/10 text-cyber-text-2 hover:text-red-400 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Tout désélectionner
          </button>
        </div>

        {/* .gitignore toggle */}
        <button
          onClick={onToggleGitignore}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
            gitignoreEnabled
              ? 'bg-purple-500/10 border border-purple-500/25 text-purple-300'
              : 'bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text-2'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            <GitBranch className="w-3.5 h-3.5" />
            Appliquer .gitignore
          </div>
          {gitignoreEnabled ? (
            <ToggleRight className="w-5 h-5 text-purple-400" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
        </button>

        {/* Minification toggle with tooltip */}
        <div className="relative group">
          <button
            onClick={onToggleMinify}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              minifyEnabled
                ? 'bg-cyber-cyan/10 neon-border text-cyber-cyan'
                : 'bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text-2'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-medium">
              <Scissors className="w-3.5 h-3.5" />
              Minification
              <Info className="w-3 h-3 opacity-40" />
            </div>
            {minifyEnabled ? (
              <ToggleRight className="w-5 h-5 text-cyber-cyan" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
          {/* Tooltip */}
          <div className="absolute left-0 right-0 bottom-full mb-1.5 px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-[11px] text-cyber-text-2 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-20 shadow-xl">
            Optimise le contexte en réduisant le nombre de tokens sans altérer la logique du code.
          </div>
        </div>
      </div>

      {/* Extension Filters */}
      <div className="px-4 py-3 border-b border-cyber-border">
        <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-2 font-semibold">
          Extensions à sélectionner
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
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
                      : 'bg-cyber-surface-2 text-cyber-text-3 border border-transparent hover:border-cyber-border'
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
