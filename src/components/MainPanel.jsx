import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Eye, FileText } from 'lucide-react';
import { MAX_PREVIEW_FILES } from '../constants';
import { useStore } from '../store';
import { isSelectionAllowed } from '../utils/filePolicy';
import { filterTreeForExport } from '../utils/treeUtils';
import { formatNumber } from '../utils/helpers';
import { generateTreeText } from '../utils/outputFormatter';
import CodeBlock from './CodeBlock';
import FileTypeIcon from './FileTypeIcon';

export default function MainPanel() {
  const projectName = useStore((state) => state.projectName);
  const tree = useStore((state) => state.tree);
  const selectedPaths = useStore((state) => state.selectedPaths);
  const minifyEnabled = useStore((state) => state.minifyEnabled);
  const projectLoaded = useStore((state) => state.projectLoaded);
  const files = useStore((state) => state.files);
  const includeFullTreeInExport = useStore((state) => state.includeFullTreeInExport);

  const selectedFiles = useMemo(() => files
    .filter((file) => isSelectionAllowed(file) && selectedPaths.has(file.path))
    .sort((left, right) => right.size - left.size), [files, selectedPaths]);
  const totalTokens = useMemo(() => selectedFiles.reduce(
    (sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens),
    0
  ), [selectedFiles, minifyEnabled]);
  const treeText = useMemo(() => {
    const filteredTree = filterTreeForExport(tree, selectedPaths, includeFullTreeInExport);
    return filteredTree ? generateTreeText(filteredTree, '', true, true) : '';
  }, [tree, selectedPaths, includeFullTreeInExport]);
  const previewFiles = selectedFiles.slice(0, MAX_PREVIEW_FILES);
  const isEmpty = selectedFiles.length === 0;

  return (
    <div className="workspace-panel flex flex-1 flex-col overflow-hidden">
      <div className="panel-toolbar flex items-center gap-2 border-b border-cyber-border px-5 py-3">
        <Eye className="h-4 w-4 text-cyber-accent" aria-hidden="true" />
        <span className="text-sm font-medium text-cyber-text-2">Prévisualisation</span>
        {!isEmpty ? <span className="font-mono text-xs text-cyber-text-3">· {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} · {formatNumber(totalTokens)} tokens</span> : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center text-cyber-text-3">
            <div className="px-6 text-center">
              <FileText className="mx-auto mb-5 h-16 w-16 text-cyber-accent/50" aria-hidden="true" />
              <p className="text-sm font-medium text-cyber-text-2">
                {projectLoaded && files.length === 0 ? 'Aucun fichier admissible trouve' : 'Aucun fichier selectionne'}
              </p>
              <p className="mt-1.5 max-w-xs text-xs text-cyber-text-3">
                {projectLoaded && files.length === 0
                  ? 'Ce projet ne contient aucun fichier texte compatible avec les filtres actuels.'
                  : 'Selectionnez des fichiers dans le panneau lateral pour generer votre contexte.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
              <p className="font-mono text-sm font-semibold text-cyber-accent">
                [CONTEXTPACKER · {projectName}] · {formatNumber(totalTokens)} tokens · source preservee
              </p>
            </motion.div>

            {treeText ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-cyber-text-3">Structure</p>
                <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-cyber-text-2">{treeText}</pre>
              </motion.div>
            ) : null}

            {selectedFiles.length > previewFiles.length ? (
              <p className="text-[11px] text-cyber-text-3">Prévisualisation limitée à {MAX_PREVIEW_FILES} fichiers. L'export conserve la sélection complète.</p>
            ) : null}

            {previewFiles.map((file, index) => {
              const content = minifyEnabled ? file.minifiedContent : file.content;
              const tokens = minifyEnabled ? file.minifiedTokens : file.tokens;
              return (
                <motion.div key={file.path} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.02, 0.4) }} className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-cyber-border bg-cyber-surface-2/50 px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileTypeIcon fileName={file.name || file.path.split('/').pop()} extension={file.extension} />
                      <span className="truncate font-mono text-xs text-cyber-accent">{file.path}</span>
                    </div>
                    <span className="ml-3 shrink-0 font-mono text-[10px] text-cyber-text-3">{content.split('\n').length}L · {formatNumber(tokens)} tokens</span>
                  </div>
                  <div className="overflow-x-auto"><CodeBlock code={content} filePath={file.path} /></div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
