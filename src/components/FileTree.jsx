import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  Ban,
  Check,
  Minus,
} from 'lucide-react';
import { formatSize } from '../utils/helpers';
import { getLangColor } from '../utils/languageBadge';
import { sortTreeChildren } from '../utils/treeUtils';

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.swift', '.kt', '.dart',
  '.vue', '.svelte', '.css', '.scss', '.less', '.html', '.sh',
  '.jsonc',
]);

function matchesSearch(node, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  if (node.name.toLowerCase().includes(q)) return true;
  if (node.children) return node.children.some((child) => matchesSearch(child, q));
  return false;
}

const FileTree = memo(function FileTree({
  node,
  selectedPaths,
  selectionIndex,
  onToggleFolder,
  minifyEnabled,
  depth = 0,
  isRoot = false,
  searchQuery = '',
  expandedPaths,
  onToggleExpanded,
  onFileClick,
}) {
  const isDirectory = node.type === 'directory';
  const expanded = isRoot || expandedPaths?.has(node.path) || (Boolean(searchQuery) && isDirectory && matchesSearch(node, searchQuery));
  const isBlocked = Boolean(node.blocked || node.selectable === false);

  const selectionState = useMemo(() => {
    if (!isDirectory) {
      if (isBlocked) return 'none';
      return selectedPaths.has(node.path) ? 'all' : 'none';
    }
    const summary = selectionIndex?.get(node.path);
    if (!summary || summary.selectableCount === 0 || summary.selectedCount === 0) return 'none';
    if (summary.selectedCount === summary.selectableCount) return 'all';
    return 'some';
  }, [isDirectory, node.path, isBlocked, selectionIndex, selectedPaths]);

  const sortedChildren = useMemo(() => {
    if (!node.children) return [];
    return sortTreeChildren(node.children);
  }, [node.children]);

  const handleCheckboxClick = (event) => {
    event.stopPropagation();
    if (isDirectory) {
      onToggleFolder(node.path);
    } else {
      if (isBlocked) return;
      onFileClick(node.path, event);
    }
  };

  const tokens = isDirectory ? null : minifyEnabled ? node.minifiedTokens : node.tokens;

  if (isRoot) {
    const visible = sortedChildren.filter((child) => matchesSearch(child, searchQuery));

    if (visible.length === 0) {
      return (
        <div className="px-3 py-6 text-center text-[11px] text-cyber-text-3">
          Aucun fichier trouvé pour "{searchQuery}"
        </div>
      );
    }
    return (
      <div>
        {visible.map((child) => (
          <FileTree
            key={child.path}
            node={child}
            selectedPaths={selectedPaths}
            selectionIndex={selectionIndex}
            onToggleFolder={onToggleFolder}
            minifyEnabled={minifyEnabled}
            depth={depth + 1}
            searchQuery={searchQuery}
            expandedPaths={expandedPaths}
            onToggleExpanded={onToggleExpanded}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    );
  }

  // Skip non-matching nodes (but directories that contain matching children pass through)
  if (searchQuery && !isDirectory && !matchesSearch(node, searchQuery)) {
    return null;
  }
  if (searchQuery && isDirectory && !matchesSearch(node, searchQuery)) {
    return null;
  }

  const isCode = node.extension && CODE_EXTENSIONS.has(node.extension);
  const FileIcon = isDirectory ? (expanded ? FolderOpen : Folder) : isCode ? FileCode2 : FileText;
  const iconColor = isDirectory ? 'text-cyber-accent/60' : isCode ? 'text-cyber-text-2' : 'text-cyber-text-3';

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-[4px] px-1.5 rounded-md ${isBlocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-cyber-surface-2'} transition-colors duration-100 ${
          !isDirectory && selectionState === 'all' ? 'bg-cyber-accent/[0.06]' : ''
        }`}
        style={{ paddingLeft: `${(depth - 1) * 14 + 4}px` }}
        onClick={(e) => {
          if (isBlocked) return;
          if (isDirectory) {
            onToggleExpanded(node.path);
            return;
          }
          handleCheckboxClick(e);
        }}
      >
        {isDirectory ? (
          <span className="w-4 h-4 flex items-center justify-center text-cyber-text-3 flex-shrink-0">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        <button
          onClick={handleCheckboxClick}
          disabled={isBlocked}
          aria-label={isBlocked ? `${node.name}, bloqué et non sélectionnable` : `Sélectionner ${node.name}`}
          title={isBlocked ? `Bloqué : ${node.blockedReason || 'fichier sensible'}` : undefined}
          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors border ${
            selectionState === 'all'
              ? 'bg-cyber-accent/25 border-cyber-accent/50 text-cyber-accent'
              : selectionState === 'some'
                ? 'bg-cyber-accent/12 border-cyber-accent/35 text-cyber-accent'
                : 'border-cyber-border hover:border-cyber-text-3'
          }`}
        >
          {isBlocked ? <Ban className="w-2.5 h-2.5" /> : null}
          {!isBlocked && selectionState === 'all' ? <Check className="w-2.5 h-2.5" /> : null}
          {!isBlocked && selectionState === 'some' ? <Minus className="w-2.5 h-2.5" /> : null}
        </button>

        {!isDirectory && getLangColor(node.extension) && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getLangColor(node.extension) }} />
        )}
        {!isDirectory && !getLangColor(node.extension) && <span className="w-2 h-2 flex-shrink-0" />}

        {isBlocked ? <Ban className="w-3.5 h-3.5 flex-shrink-0 text-red-400" aria-hidden="true" /> : <FileIcon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />}

        <span className="text-[12px] truncate flex-1 text-cyber-text-2 group-hover:text-cyber-text transition-colors" title={node.path}>
          {node.name}
        </span>
        {isBlocked ? <span className="text-[9px] text-red-300/80 uppercase">bloqué</span> : null}

        {!isDirectory ? (
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {node.lines != null ? (
              <span className="text-[9px] font-mono text-cyber-text-3 tabular-nums" title="Lignes">
                {node.lines}L
              </span>
            ) : null}
            {node.size != null ? (
              <span className="text-[9px] font-mono text-cyber-text-3 tabular-nums" title="Taille">
                {formatSize(node.size)}
              </span>
            ) : null}
            {tokens != null ? (
              <span className="text-[9px] font-mono text-cyber-accent/50 tabular-nums" title="Tokens">
                {tokens > 999 ? `${(tokens / 1000).toFixed(1)}k` : tokens}t
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {isDirectory ? (
        <AnimatePresence initial={false}>
          {expanded && sortedChildren.length > 0 ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {sortedChildren.map((child) => (
                <FileTree
                  key={child.path}
                  node={child}
                  selectedPaths={selectedPaths}
                  selectionIndex={selectionIndex}
                  onToggleFolder={onToggleFolder}
                  minifyEnabled={minifyEnabled}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  expandedPaths={expandedPaths}
                  onToggleExpanded={onToggleExpanded}
                  onFileClick={onFileClick}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </div>
  );
});

export default FileTree;
