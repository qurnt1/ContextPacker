import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { getLangColor } from '../utils/languageBadge';
import CodeBlock from './CodeBlock';
import { generateTreeText } from '../utils/outputFormatter';
import { formatNumber } from '../utils/helpers';
import { useStore } from '../store';

function filterTree(node, selectedPaths) {
  if (!node) return null;
  if (node.type === 'file') {
    return selectedPaths.has(node.path) ? { ...node } : null;
  }
  const filteredChildren = (node.children || [])
    .map((child) => filterTree(child, selectedPaths))
    .filter(Boolean);
  if (filteredChildren.length === 0) return null;
  return { ...node, children: filteredChildren };
}

export default function MainPanel() {
  const projectName = useStore((s) => s.projectName);
  const tree = useStore((s) => s.tree);
  const selectedPaths = useStore((s) => s.selectedPaths);
  const minifyEnabled = useStore((s) => s.minifyEnabled);
  const files = useStore((s) => s.files);

  const selectedFiles = useMemo(
    () =>
      files
        .filter((file) => selectedPaths.has(file.path))
        .sort((a, b) => b.size - a.size),
    [files, selectedPaths]
  );

  const totalTokens = useMemo(
    () =>
      selectedFiles.reduce(
        (sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens),
        0
      ),
    [selectedFiles, minifyEnabled]
  );

  const treeText = useMemo(() => {
    const filtered = filterTree(tree, selectedPaths);
    return filtered ? generateTreeText(filtered, '', true, true) : '';
  }, [tree, selectedPaths]);

  const isEmpty = selectedFiles.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cyber-bg transition-colors duration-300">
      {/* Preview header */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-cyber-border bg-cyber-surface/40">
        <Eye className="w-4 h-4 text-cyber-accent" />
        <span className="text-sm font-medium text-cyber-text-2">Prévisualisation</span>
        {!isEmpty ? (
          <span className="text-xs text-cyber-text-3 font-mono">
            · {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} · {formatNumber(totalTokens)} tokens
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-cyber-text-3">
            <div className="text-center px-6">
              <svg className="w-24 h-24 mx-auto mb-5 opacity-40" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                <rect x="16" y="8" width="48" height="56" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-cyber-text-3" />
                <rect x="32" y="20" width="48" height="56" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-cyber-text-2" />
                <line x1="36" y1="36" x2="60" y2="36" stroke="currentColor" strokeWidth="1" className="text-cyber-accent/40" />
                <line x1="36" y1="44" x2="56" y2="44" stroke="currentColor" strokeWidth="1" className="text-cyber-accent/40" />
                <line x1="36" y1="52" x2="52" y2="52" stroke="currentColor" strokeWidth="1" className="text-cyber-accent/40" />
                <path d="M44 8V20H64L44 8Z" stroke="currentColor" strokeWidth="1.5" className="text-cyber-text-2" />
              </svg>
              <p className="text-sm font-medium text-cyber-text-2">Aucun fichier sélectionné</p>
              <p className="text-xs mt-1.5 text-cyber-text-3 max-w-xs">
                Sélectionnez des fichiers dans le panneau latéral pour générer votre contexte.
              </p>
              <p className="text-[10px] mt-3 text-cyber-text-3/70">
                Raccourci : <kbd className="px-1 py-0.5 rounded bg-cyber-surface-2 border border-cyber-border text-[10px] font-mono">Ctrl+A</kbd> pour tout sélectionner
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Context header */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              <div className="font-mono text-sm">
                <p className="text-cyber-accent font-semibold">
                  [CONTEXTPACKER · {projectName}] · {formatNumber(totalTokens)} tokens · minification:{' '}
                  {minifyEnabled ? 'ON' : 'OFF'}
                </p>
              </div>
            </motion.div>

            {/* Tree structure */}
            {treeText ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="card p-4"
              >
                <p className="text-[10px] uppercase tracking-wider text-cyber-text-3 mb-3 font-semibold">
                  Structure
                </p>
                <pre className="font-mono text-xs text-cyber-text-2 leading-relaxed whitespace-pre overflow-x-auto">
                  {treeText}
                </pre>
              </motion.div>
            ) : null}

            {/* File cards */}
            {selectedFiles.map((file, index) => {
              const content = minifyEnabled ? file.minifiedContent : file.content;
              const tokens = minifyEnabled ? file.minifiedTokens : file.tokens;
              const lines = content.split('\n').length;
              const langColor = getLangColor(file.extension);

              return (
                <motion.div
                  key={file.path}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.4) }}
                  className="card overflow-hidden"
                  style={langColor ? { borderTopColor: langColor, borderTopWidth: '2px' } : undefined}
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-cyber-surface-2/50 border-b border-cyber-border">
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => { const c = getLangColor(file.extension); return c ? <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} title={file.extension} /> : null; })()}
                      <span className="font-mono text-xs text-cyber-accent truncate">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className="font-mono text-[10px] text-cyber-text-3">
                        {lines}L · {formatNumber(tokens)} tokens
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <CodeBlock code={content} filePath={file.path} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
