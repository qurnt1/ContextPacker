import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  CheckSquare,
  Square,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Package,
  FolderTree,
  GitBranch,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import FileTree from './FileTree';
import { useStore } from '../store';
import { isSelectionAllowed } from '../utils/filePolicy';
import { buildSelectionIndex, getSearchResultPaths } from '../utils/treeUtils';

function sortNodes(nodes) {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function getDefaultExpandedPaths(node, depth = 0, paths = new Set()) {
  if (node.type !== 'directory') return paths;
  if (node.path && depth < 3) paths.add(node.path);
  (node.children || []).forEach((child) => getDefaultExpandedPaths(child, depth + 1, paths));
  return paths;
}

function collectVisibleFilePaths(node, expandedPaths, searchQuery = '') {
  const paths = [];
  const visit = (current, isRoot = false) => {
    for (const child of sortNodes(current.children || [])) {
      if (searchQuery && !matchesSearch(child, searchQuery)) continue;
      if (child.type === 'file') {
        paths.push(child.path);
      } else if (isRoot || expandedPaths.has(child.path)) {
        visit(child);
      }
    }
  };
  visit(node, true);
  return paths;
}

function matchesSearch(node, query) {
  const normalized = query.toLowerCase();
  return node.name.toLowerCase().includes(normalized)
    || (node.children || []).some((child) => matchesSearch(child, query));
}

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
  const selectRange = useStore((s) => s.selectRange);
  const toggleExtension = useStore((s) => s.toggleExtension);
  const selectAll = useStore((s) => s.selectAll);
  const deselectAll = useStore((s) => s.deselectAll);
  const setMinifyEnabled = useStore((s) => s.setMinifyEnabled);
  const setGitignoreEnabled = useStore((s) => s.setGitignoreEnabled);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const includeFullTreeInExport = useStore((s) => s.includeFullTreeInExport);
  const setIncludeFullTreeInExport = useStore((s) => s.setIncludeFullTreeInExport);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [lastClickedPath, setLastClickedPath] = useState(null);
  const fileByPath = useMemo(() => new Map(files.map((file) => [file.path, file])), [files]);

  useEffect(() => {
    setExpandedPaths(tree ? getDefaultExpandedPaths(tree) : new Set());
    setLastClickedPath(null);
  }, [tree]);

  useEffect(() => {
    const focusSearch = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener('contextpacker:focus-search', focusSearch);
    return () => window.removeEventListener('contextpacker:focus-search', focusSearch);
  }, []);

  const visibleFilePaths = useMemo(
    () => {
      if (!tree) return [];
      const paths = searchQuery
        ? getSearchResultPaths(tree, searchQuery)
        : collectVisibleFilePaths(tree, expandedPaths);
      return paths.filter((path) => isSelectionAllowed(fileByPath.get(path)));
    },
    [tree, expandedPaths, searchQuery, fileByPath]
  );

  const selectionIndex = useMemo(
    () => (tree ? buildSelectionIndex(tree, selectedPaths) : new Map()),
    [tree, selectedPaths]
  );

  const handleToggleExpanded = (path) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleFileClick = (path, event) => {
    if (event.shiftKey && lastClickedPath) {
      selectRange(lastClickedPath, path, visibleFilePaths);
    } else {
      togglePath(path);
    }
    setLastClickedPath(path);
  };

  const extensionStats = useMemo(() => {
    const countMap = new Map();
    files.filter((file) => isSelectionAllowed(file)).forEach((file) => {
      if (!file.extension) return;
      const current = countMap.get(file.extension) || { total: 0, selected: 0 };
      current.total += 1;
      if (selectedPaths.has(file.path)) current.selected += 1;
      countMap.set(file.extension, current);
    });
    return [...countMap.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [files, selectedPaths]);

  const visibleCount = useMemo(() => {
    return visibleFilePaths.length;
  }, [visibleFilePaths]);

  const gitignoreActionLabel = isScanning
    ? 'Actualisation du projet en cours.'
    : gitignoreEnabled
      ? 'Désactiver .gitignore et actualiser immédiatement le projet.'
      : 'Activer .gitignore et actualiser immédiatement le projet.';

  // ── Collapsed: thin strip — toggle at top, actions below, no bottom button ──
  if (sidebarCollapsed) {
    return (
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="app-sidebar w-full h-full flex flex-col items-center border-r border-cyber-border overflow-hidden transition-colors duration-300 py-3 gap-2.5"
      >
        {/* Toggle button at top — same position as in expanded header */}
        <button
          onClick={toggleSidebar}
          title="Afficher le panneau latéral"
          aria-label="Afficher le panneau latéral"
          aria-expanded={false}
          aria-controls="sidebar"
          className="p-1.5 rounded-md hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-accent transition-colors"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        {/* Select all */}
        <button onClick={selectAll} title="Tout sélectionner" className="p-1.5 rounded-md hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-accent transition-colors">
          <CheckSquare className="w-4 h-4" />
        </button>

        {/* Deselect all */}
        <button onClick={deselectAll} title="Tout désélectionner" className="p-1.5 rounded-md hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-red-400 transition-colors">
          <Square className="w-4 h-4" />
        </button>

        {/* .gitignore toggle */}
        <button
          onClick={() => setGitignoreEnabled((v) => !v)}
          disabled={isScanning}
          title={gitignoreActionLabel}
          aria-label={gitignoreActionLabel}
          aria-pressed={gitignoreEnabled}
          aria-busy={isScanning}
          className={`p-1.5 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${gitignoreEnabled ? 'text-cyber-accent bg-cyber-accent/10' : 'text-cyber-text-3 hover:text-cyber-accent hover:bg-cyber-surface-2'}`}
        >
          <GitBranch className="w-4 h-4" />
        </button>

        {/* Minification toggle */}
        <button onClick={() => setMinifyEnabled((v) => !v)} title="Réduit les métadonnées et séparateurs de l’export. Les JSON valides sont compactés, les autres sources restent intactes." aria-label="Formatage compact" aria-pressed={minifyEnabled} className={`p-1.5 rounded-md transition-colors ${minifyEnabled ? 'text-cyber-accent bg-cyber-accent/10' : 'text-cyber-text-3 hover:text-cyber-accent hover:bg-cyber-surface-2'}`}>
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
      className="app-sidebar w-full h-full flex flex-col border-r border-cyber-border overflow-hidden transition-colors duration-300"
    >
      <div className="flex h-12 min-h-12 shrink-0 items-center justify-between gap-2 border-b border-cyber-border px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Package className="h-4 w-4 shrink-0 text-cyber-accent" aria-hidden="true" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-cyber-text">{projectName}</h2>
        </div>
        <button
          onClick={toggleSidebar}
          title="Masquer le panneau latéral"
          aria-label="Masquer le panneau latéral"
          aria-expanded={true}
          aria-controls="sidebar"
          className="shrink-0 rounded-md p-1.5 text-cyber-text-3 transition-colors hover:bg-cyber-surface-2 hover:text-cyber-accent"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
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
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-cyber-text-3 hover:text-cyber-text">
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
          <button onClick={selectAll} className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent bg-cyber-surface-2 px-2.5 py-1.5 text-[11px] text-cyber-text-2 transition-colors hover:border-cyber-accent/20 hover:bg-cyber-accent/10 hover:text-cyber-accent">
            <CheckSquare className="w-3 h-3" />Tout sélectionner
          </button>
          <button onClick={deselectAll} className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent bg-cyber-surface-2 px-2.5 py-1.5 text-[11px] text-cyber-text-2 transition-colors hover:border-red-500/20 hover:bg-red-500/8 hover:text-red-700">
            <Square className="w-3 h-3" />Tout désélectionner
          </button>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setGitignoreEnabled((v) => !v)}
            disabled={isScanning}
            aria-pressed={gitignoreEnabled}
            aria-label={gitignoreActionLabel}
            title={gitignoreActionLabel}
            aria-busy={isScanning}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${gitignoreEnabled ? 'border-cyber-accent/20 bg-cyber-accent/10 text-cyber-accent' : 'border-transparent bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text-2'}`}
          >
            <GitBranch className="h-3 w-3 shrink-0" /><span className="truncate whitespace-nowrap">.gitignore</span>
            {gitignoreEnabled ? <ToggleRight className="w-4 h-4 text-cyber-accent" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => setMinifyEnabled((v) => !v)} aria-pressed={minifyEnabled} className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] transition-colors ${minifyEnabled ? 'border-cyber-accent/20 bg-cyber-accent/10 text-cyber-accent' : 'border-transparent bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text-2'}`} title="Réduit les métadonnées et séparateurs de l’export. Les JSON valides sont compactés, les autres sources restent intactes.">
            <Scissors className="h-3 w-3 shrink-0" /><span className="truncate whitespace-nowrap">Formatage compact</span>
            {minifyEnabled ? <ToggleRight className="w-4 h-4 text-cyber-accent" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
        </div>
        <label className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] transition-colors focus-within:ring-2 focus-within:ring-cyber-accent/50 focus-within:ring-offset-1 focus-within:ring-offset-cyber-surface ${includeFullTreeInExport ? 'border-cyber-accent/20 bg-cyber-accent/10 text-cyber-accent' : 'border-transparent bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text-2'}`} title="Inclut aussi les dossiers et fichiers non sélectionnés dans la structure de l’export.">
          <input
            type="checkbox"
            checked={includeFullTreeInExport}
            onChange={(event) => setIncludeFullTreeInExport(event.target.checked)}
            className="sr-only"
          />
          <FolderTree className="w-3 h-3" />
          <span>Arborescence complète</span>
          {includeFullTreeInExport ? <ToggleRight className="w-4 h-4 text-cyber-accent" /> : <ToggleLeft className="w-4 h-4" />}
        </label>
      </div>

      {/* Extensions */}
      {extensionStats.length > 0 && (
        <div className="px-3 py-2.5 border-b border-cyber-border">
          <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-2 font-semibold">Extensions</p>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {extensionStats.map(([ext, counts]) => {
              const { total, selected } = counts;
              const allSelected = selected === total;
              return (
                <button key={ext} onClick={() => toggleExtension(ext)} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition-colors ${allSelected ? 'border border-cyber-accent/25 bg-cyber-accent/15 text-cyber-accent' : selected > 0 ? 'border border-cyber-accent/15 bg-cyber-accent/8 text-cyber-accent/70' : 'border border-transparent bg-cyber-surface-2 text-cyber-text-3 hover:border-cyber-border'}`}>
                  <span>{ext || '(aucune)'}</span>
                  <span className="text-[9px] opacity-50">{selected}/{total}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* File tree */}
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
          <FileTree node={tree} selectedPaths={selectedPaths} selectionIndex={selectionIndex} onToggleFolder={toggleFolder} minifyEnabled={minifyEnabled} depth={0} isRoot searchQuery={searchQuery} expandedPaths={expandedPaths} onToggleExpanded={handleToggleExpanded} onFileClick={handleFileClick} />
        ) : null}
      </div>
    </motion.aside>
  );
}
