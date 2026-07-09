import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Square,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Package,
  GitBranch,
  Search,
  X,
  PanelLeftOpen,
} from 'lucide-react';
import FileTree from './FileTree';
import { formatNumber } from '../utils/helpers';
import { useStore } from '../store';

export default function Sidebar() {
  const projectName = useStore((s) => s.projectName);
  const tree = useStore((s) => s.tree);
  const files = useStore((s) => s.files);
  const isScanning = useStore((s) => s.isScanning);
  const selectedPaths = useStore((s) => s.selectedPaths);
  const minifyEnabled = useStore((s) => s.minifyEnabled);
  const gitignoreEnabled = useStore((s) => s.gitignoreEnabled);
  const togglePath = useStore((s) => s.togglePath);
  const toggleFolder = useStore((s) => s.toggleFolder);
  const toggleExtension = useStore((s) => s.toggleExtension);
  const selectAll = useStore((s) => s.selectAll);
  const deselectAll = useStore((s) => s.deselectAll);
  const setMinifyEnabled = useStore((s) => s.setMinifyEnabled);
  const setGitignoreEnabled = useStore((s) => s.setGitignoreEnabled);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Expose searchInputRef globally for keyboard shortcut (Ctrl+F)
  if (typeof window !== 'undefined') {
    window.__cpSearchInputRef = searchInputRef;
  }

  // Compute derived data with useMemo to avoid new references on every render
  const extensions = useMemo(() => {
    const countMap = {};
    files.forEach((file) => {
      if (!file.extension) return;
      countMap[file.extension] = (countMap[file.extension] || 0) + 1;
    });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([ext]) => ext);
  }, [files]);

  const stats = useMemo(() => {
    const selected = files.filter((file) => selectedPaths.has(file.path));
    const totalTokens = selected.reduce(
      (sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens),
      0
    );
    const totalSize = selected.reduce((sum, file) => sum + file.size, 0);
    const totalLines = selected.reduce((sum, file) => sum + (file.lines || 0), 0);
    return {
      totalTokens,
      totalSize,
      totalLines,
      fileCount: selected.length,
      totalFiles: files.length,
    };
  }, [files, selectedPaths, minifyEnabled]);

  const visibleCount = useMemo(() => {
    if (!searchQuery) return files.length;
    const q = searchQuery.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(q)).length;
  }, [files, searchQuery]);

  // Collapsed mode: thin icon strip
  if (sidebarCollapsed) {
    return (
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col items-center bg-cyber-surface border-r border-cyber-border overflow-hidden transition-colors duration-300 py-3 gap-3"
      >
        <button onClick={toggleSidebar} title="Afficher le panneau" className="p-1.5 rounded-md hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-accent transition-colors">
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <button onClick={selectAll} title="Tout sélectionner" className="p-1.5 rounded-md hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-accent transition-colors">
          <CheckSquare className="w-4 h-4" />
        </button>
        <button onClick={() => setGitignoreEnabled((v) => !v)} title=".gitignore" className={`p-1.5 rounded-md transition-colors ${gitignoreEnabled ? 'text-cyber-accent bg-cyber-accent/10' : 'text-cyber-text-3 hover:text-cyber-accent hover:bg-cyber-surface-2'}`}>
          <GitBranch className="w-4 h-4" />
        </button>
        <button onClick={() => setMinifyEnabled((v) => !v)} title="Minification" className={`p-1.5 rounded-md transition-colors ${minifyEnabled ? 'text-cyber-accent bg-cyber-accent/10' : 'text-cyber-text-3 hover:text-cyber-accent hover:bg-cyber-surface-2'}`}>
          <Scissors className="w-4 h-4" />
        </button>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full flex flex-col bg-cyber-surface border-r border-cyber-border overflow-hidden transition-colors duration-300"
    >
      {/* Header */}
      <div className="p-4 border-b border-cyber-border">
        <div className="flex items-center gap-2 min-w-0 mb-2">
          <Package className="w-4 h-4 text-cyber-accent flex-shrink-0" />
          <h2 className="font-semibold text-sm text-cyber-text truncate">{projectName}</h2>
        </div>
        <div className="text-xs text-cyber-text-3 flex items-center gap-2 flex-wrap">
          <span>
            <motion.span
              key={stats.fileCount}
              initial={{ scale: 1.4, color: '#22c55e' }}
              animate={{ scale: 1, color: 'var(--cp-text-2)' }}
              transition={{ duration: 0.25 }}
              className="font-medium tabular-nums"
            >
              {stats.fileCount}
            </motion.span>/{stats.totalFiles}
          </span>
          <span className="text-cyber-border">·</span>
          <span>
            <span className="text-cyber-text-2 font-medium">{formatNumber(stats.totalTokens)}</span> tokens
          </span>
          <span className="text-cyber-border">·</span>
          <span>
            <span className="text-cyber-text-2 font-medium">{formatNumber(stats.totalLines)}</span> lignes
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-cyber-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyber-text-3" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer les fichiers..."
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md bg-cyber-surface-2 border border-cyber-border text-cyber-text placeholder:text-cyber-text-3/50 focus:outline-none focus:border-cyber-accent/40 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-cyber-text-3 hover:text-cyber-text"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[10px] text-cyber-text-3 mt-1.5 px-1">
            {visibleCount} fichier{visibleCount !== 1 ? 's' : ''} visible{visibleCount !== 1 ? 's' : ''} sur {files.length}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 border-b border-cyber-border space-y-2">
        <div className="flex gap-1.5">
          <button
            onClick={selectAll}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-cyber-surface-2 hover:bg-cyber-accent/10 text-cyber-text-2 hover:text-cyber-accent border border-transparent hover:border-cyber-accent/20 transition-all"
          >
            <CheckSquare className="w-3 h-3" />
            Tout sélectionner
          </button>
          <button
            onClick={deselectAll}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md bg-cyber-surface-2 hover:bg-red-500/8 text-cyber-text-2 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all"
          >
            <Square className="w-3 h-3" />
            Désélectionner
          </button>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setGitignoreEnabled((v) => !v)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md transition-all ${
              gitignoreEnabled
                ? 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20'
                : 'bg-cyber-surface-2 text-cyber-text-3 border border-transparent hover:text-cyber-text-2'
            }`}
          >
            <GitBranch className="w-3 h-3" />
            .gitignore
            {gitignoreEnabled ? (
              <ToggleRight className="w-4 h-4 text-cyber-accent" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setMinifyEnabled((v) => !v)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md transition-all ${
              minifyEnabled
                ? 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20'
                : 'bg-cyber-surface-2 text-cyber-text-3 border border-transparent hover:text-cyber-text-2'
            }`}
            title="Optimise le contexte en réduisant le nombre de tokens sans altérer la logique du code."
          >
            <Scissors className="w-3 h-3" />
            Minifier
            {minifyEnabled ? (
              <ToggleRight className="w-4 h-4 text-cyber-accent" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Extensions */}
      {extensions.length > 0 && (
        <div className="px-3 py-2.5 border-b border-cyber-border">
          <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-2 font-semibold">
            Extensions
          </p>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {extensions.map((ext) => {
              const total = files.filter((file) => file.extension === ext).length;
              const selected = files.filter((file) => file.extension === ext && selectedPaths.has(file.path)).length;
              const allSelected = selected === total;

              return (
                <button
                  key={ext}
                  onClick={() => toggleExtension(ext)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                    allSelected
                      ? 'bg-cyber-accent/15 text-cyber-accent border border-cyber-accent/25'
                      : selected > 0
                        ? 'bg-cyber-accent/8 text-cyber-accent/70 border border-cyber-accent/15'
                        : 'bg-cyber-surface-2 text-cyber-text-3 border border-transparent hover:border-cyber-border'
                  }`}
                >
                  <span>{ext || '(aucune)'}</span>
                  <span className="text-[9px] opacity-50">{selected}/{total}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* File tree / skeleton */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
        {isScanning && files.length === 0 ? (
          <div className="space-y-2 animate-pulse px-1.5">
            {['70%', '45%', '80%', '55%', '65%', '40%', '75%', '50%', '60%', '85%', '35%', '55%'].map((width, i) => (
              <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${(i % 3) * 12}px` }}>
                <div className="w-3 h-3 rounded bg-cyber-surface-2" />
                <div className="h-3 rounded bg-cyber-surface-2" style={{ width }} />
              </div>
            ))}
          </div>
        ) : tree ? (
          <FileTree
            node={tree}
            files={files}
            selectedPaths={selectedPaths}
            onTogglePath={togglePath}
            onToggleFolder={toggleFolder}
            minifyEnabled={minifyEnabled}
            depth={0}
            isRoot
            searchQuery={searchQuery}
          />
        ) : null}
      </div>
    </motion.aside>
  );
}
