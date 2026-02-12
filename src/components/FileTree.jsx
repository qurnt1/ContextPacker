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
import { formatSize, formatNumber } from '../utils/helpers';

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

  // Compute selection state for directories
  const selectionState = useMemo(() => {
    if (!isDirectory) {
      return selectedPaths.has(node.path) ? 'all' : 'none';
    }

    const descendantFiles = files.filter(
      (f) => f.path.startsWith(node.path ? node.path + '/' : '')
    );
    if (descendantFiles.length === 0) return 'none';

    const selectedCount = descendantFiles.filter((f) => selectedPaths.has(f.path)).length;
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

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    if (isDirectory) {
      onToggleFolder(node.path);
    } else {
      onTogglePath(node.path);
    }
  };

  const tokens = isDirectory
    ? null
    : minifyEnabled
      ? node.minifiedTokens
      : node.tokens;

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
  const FileIcon = isDirectory
    ? expanded
      ? FolderOpen
      : Folder
    : isCode
      ? FileCode2
      : FileText;

  const iconColor = isDirectory
    ? 'text-cyber-cyan/70'
    : isCode
      ? 'text-purple-400/70'
      : 'text-gray-500';

  return (
    <div>
      {/* Node row */}
      <div
        className={`group flex items-center gap-1 py-[3px] px-1 rounded cursor-pointer transition-colors duration-150 hover:bg-white/[0.03] ${
          !isDirectory && selectionState === 'all' ? 'bg-cyber-cyan/[0.04]' : ''
        }`}
        style={{ paddingLeft: `${(depth - 1) * 16 + 4}px` }}
        onClick={() => (isDirectory ? setExpanded((v) => !v) : handleCheckboxClick({ stopPropagation: () => {} }))}
      >
        {/* Expand/collapse for dirs */}
        {isDirectory ? (
          <span className="w-4 h-4 flex items-center justify-center text-gray-500 flex-shrink-0">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors border ${
            selectionState === 'all'
              ? 'bg-cyber-cyan/30 border-cyber-cyan/60 text-cyber-cyan'
              : selectionState === 'some'
                ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan'
                : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          {selectionState === 'all' && <Check className="w-2.5 h-2.5" />}
          {selectionState === 'some' && <Minus className="w-2.5 h-2.5" />}
        </button>

        {/* Icon */}
        <FileIcon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />

        {/* Name */}
        <span className="text-[12px] truncate flex-1 text-gray-300 group-hover:text-gray-100 transition-colors">
          {node.name}
        </span>

        {/* Tokens badge (files only) */}
        {!isDirectory && tokens != null && (
          <span className="text-[9px] font-mono text-gray-600 flex-shrink-0 tabular-nums">
            {tokens > 999 ? `${(tokens / 1000).toFixed(1)}k` : tokens}
          </span>
        )}

        {/* Size badge (files only) */}
        {!isDirectory && node.size != null && (
          <span className="text-[9px] font-mono text-gray-700 flex-shrink-0 ml-1 tabular-nums">
            {formatSize(node.size)}
          </span>
        )}
      </div>

      {/* Children */}
      {isDirectory && (
        <AnimatePresence initial={false}>
          {expanded && sortedChildren.length > 0 && (
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
          )}
        </AnimatePresence>
      )}
    </div>
  );
});

export default FileTree;
