import { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  Check,
  Minus,
} from 'lucide-react';
import { formatSize } from '../utils/helpers';

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.swift', '.kt', '.dart',
  '.vue', '.svelte', '.css', '.scss', '.less', '.html', '.sh',
]);

const FileTree = memo(function FileTree({
  node,
  files,
  selectedPaths,
  onTogglePath,
  onToggleFolder,
  minifyEnabled,
  depth = 0,
  isRoot = false,
}) {
  const [expanded, setExpanded] = useState(depth < 3);
  const isDirectory = node.type === 'directory';

  const selectionState = useMemo(() => {
    if (!isDirectory) {
      return selectedPaths.has(node.path) ? 'all' : 'none';
    }
    const descendantFiles = files.filter((file) =>
      file.path.startsWith(node.path ? node.path + '/' : '')
    );
    if (descendantFiles.length === 0) return 'none';
    const selectedCount = descendantFiles.filter((file) => selectedPaths.has(file.path)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === descendantFiles.length) return 'all';
    return 'some';
  }, [isDirectory, node.path, files, selectedPaths]);

  const sortedChildren = useMemo(() => {
    if (!node.children) return [];
    return [...node.children].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [node.children]);

  const handleCheckboxClick = (event) => {
    event.stopPropagation();
    if (isDirectory) {
      onToggleFolder(node.path);
    } else {
      onTogglePath(node.path);
    }
  };

  const tokens = isDirectory ? null : minifyEnabled ? node.minifiedTokens : node.tokens;

  if (isRoot) {
    return (
      <div>
        {sortedChildren.map((child) => (
          <FileTree
            key={child.path}
            node={child}
            files={files}
            selectedPaths={selectedPaths}
            onTogglePath={onTogglePath}
            onToggleFolder={onToggleFolder}
            minifyEnabled={minifyEnabled}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  const isCode = node.extension && CODE_EXTENSIONS.has(node.extension);
  const FileIcon = isDirectory ? (expanded ? FolderOpen : Folder) : isCode ? FileCode2 : FileText;
  const iconColor = isDirectory ? 'text-cyber-accent/70' : isCode ? 'text-cyber-text-2' : 'text-cyber-text-3';

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-[3px] px-1 rounded cursor-pointer transition-colors duration-150 hover:bg-cyber-accent/[0.04] ${
          !isDirectory && selectionState === 'all' ? 'bg-cyber-accent/[0.06]' : ''
        }`}
        style={{ paddingLeft: `${(depth - 1) * 14 + 4}px` }}
        onClick={() => (isDirectory ? setExpanded((value) => !value) : handleCheckboxClick({ stopPropagation: () => {} }))}
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
          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors border ${
            selectionState === 'all'
              ? 'bg-cyber-accent/30 border-cyber-accent/60 text-cyber-accent'
              : selectionState === 'some'
                ? 'bg-cyber-accent/15 border-cyber-accent/40 text-cyber-accent'
                : 'border-cyber-border hover:border-cyber-text-3'
          }`}
        >
          {selectionState === 'all' ? <Check className="w-2.5 h-2.5" /> : null}
          {selectionState === 'some' ? <Minus className="w-2.5 h-2.5" /> : null}
        </button>

        <FileIcon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />

        <span className="text-[11px] truncate flex-1 text-cyber-text-2 group-hover:text-cyber-text transition-colors">
          {node.name}
        </span>

        {!isDirectory ? (
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
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
              <span className="text-[9px] font-mono text-cyber-accent/60 tabular-nums" title="Tokens">
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
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {sortedChildren.map((child) => (
                <FileTree
                  key={child.path}
                  node={child}
                  files={files}
                  selectedPaths={selectedPaths}
                  onTogglePath={onTogglePath}
                  onToggleFolder={onToggleFolder}
                  minifyEnabled={minifyEnabled}
                  depth={depth + 1}
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
