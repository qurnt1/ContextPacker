import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileCode2, Eye } from 'lucide-react';
import CodeBlock from './CodeBlock';
import { generateTreeText } from '../utils/outputFormatter';
import { formatNumber } from '../utils/helpers';

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

export default function MainPanel({
  projectName,
  selectedFiles,
  totalTokens,
  minifyEnabled,
  tree,
  selectedPaths,
}) {
  const treeText = useMemo(() => {
    const filtered = filterTree(tree, selectedPaths);
    return filtered ? generateTreeText(filtered, '', true, true) : '';
  }, [tree, selectedPaths]);

  const isEmpty = selectedFiles.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cyber-bg transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-cyber-border bg-cyber-surface/50 backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4 text-cyber-cyan" />
          <span className="font-medium text-cyber-text-2">Prévisualisation</span>
          {!isEmpty && (
            <span className="text-xs text-cyber-text-3 font-mono ml-2">
              {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} •{' '}
              {formatNumber(totalTokens)} tokens
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center h-full text-cyber-text-3">
            <div className="text-center">
              <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sélectionnez des fichiers dans le panneau latéral</p>
              <p className="text-xs mt-1 opacity-50">Aucun fichier sélectionné par défaut (lazy selection)</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Output header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-cyber-surface neon-border p-5 transition-colors duration-300"
            >
              <div className="font-mono text-sm space-y-1">
                <p className="text-cyber-cyan font-semibold">
                  [CONTEXTPACKER - PROJET: {projectName}] | TOKENS: {formatNumber(totalTokens)} | MINIFICATION: {minifyEnabled ? 'OUI' : 'NON'}
                </p>
              </div>
            </motion.div>

            {/* Tree structure */}
            {treeText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-xl bg-cyber-surface neon-border p-5 transition-colors duration-300"
              >
                <p className="text-xs uppercase tracking-wider text-cyber-text-3 mb-3 font-semibold">
                  Structure
                </p>
                <pre className="font-mono text-xs text-cyber-text-2 leading-relaxed whitespace-pre overflow-x-auto">
                  {treeText}
                </pre>
              </motion.div>
            )}

            {/* File blocks */}
            {selectedFiles.map((file, index) => {
              const content = minifyEnabled ? file.minifiedContent : file.content;
              const tokens = minifyEnabled ? file.minifiedTokens : file.tokens;
              const lines = content.split('\n').length;

              return (
                <motion.div
                  key={file.path}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5) }}
                  className="rounded-xl bg-cyber-surface neon-border overflow-hidden transition-colors duration-300"
                >
                  {/* File header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-cyber-surface-2/50 border-b border-cyber-border">
                    <span className="font-mono text-xs text-cyber-cyan truncate">
                      {file.path}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className="font-mono text-[10px] text-cyber-text-3">
                        {lines}L • {formatNumber(tokens)} tokens
                      </span>
                    </div>
                  </div>

                  {/* Syntax-highlighted code */}
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
