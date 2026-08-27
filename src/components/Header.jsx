import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen, Loader2, Keyboard, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStore } from '../store';
import { useToast } from '../hooks/useToast';
import SettingsPanel from './SettingsPanel';
import Toast from './Toast';
import ContextPackerMark from './ContextPackerMark';
import ModalPortal from './ModalPortal';
import { formatNumber } from '../utils/helpers';

const refreshDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const refreshKinds = {
  added: 'Ajouté',
  modified: 'Modifié',
  removed: 'Supprimé',
};

function parseRefreshDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function RefreshSummaryDialog({ summary, onClose, restoreFocusRef }) {
  const changes = summary?.changes || [];
  const latestModified = parseRefreshDate(summary?.latestModifiedAt);
  const changedCount = summary?.totalChanged || 0;
  const totalAddedLines = summary?.totalAddedLines || 0;
  const totalRemovedLines = summary?.totalRemovedLines || 0;

  return (
    <ModalPortal isOpen={Boolean(summary)} onClose={onClose} zIndex={220} restoreFocusRef={restoreFocusRef}>
      <AnimatePresence>
        {summary ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              style={{ zIndex: 220 }}
              aria-hidden="true"
            />
            <div
              className="fixed inset-0 z-[221] grid place-items-center p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-cyber-border bg-cyber-surface shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="refresh-summary-title"
              >
                <div className="flex items-start justify-between gap-4 border-b border-cyber-border px-5 py-4">
                  <div>
                    <h2 id="refresh-summary-title" className="text-sm font-semibold text-cyber-text">Actualisation terminée</h2>
                    <p className="mt-1 text-[11px] text-cyber-text-3">
                      {changedCount === 0
                        ? 'Aucune différence détectée.'
                        : `${changedCount} fichier${changedCount > 1 ? 's' : ''} modifié${changedCount > 1 ? 's' : ''}.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-cyber-text-3 transition-colors hover:bg-cyber-surface-2 hover:text-cyber-text"
                    aria-label="Fermer le résumé d’actualisation"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                  {latestModified ? (
                    <p className="text-xs text-cyber-text-2">
                      Dernier fichier modifié : <time dateTime={latestModified.toISOString()} className="font-medium text-cyber-text">{refreshDateFormatter.format(latestModified)}</time>
                    </p>
                  ) : null}

                  {changedCount > 0 ? (
                    <>
                      <dl className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="rounded-lg bg-cyber-surface-2 px-2 py-2">
                          <dt className="text-cyber-text-3">Ajoutés</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-cyber-text">{summary.addedFileCount || 0}</dd>
                        </div>
                        <div className="rounded-lg bg-cyber-surface-2 px-2 py-2">
                          <dt className="text-cyber-text-3">Modifiés</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-cyber-text">{summary.modifiedFileCount || 0}</dd>
                        </div>
                        <div className="rounded-lg bg-cyber-surface-2 px-2 py-2">
                          <dt className="text-cyber-text-3">Supprimés</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-cyber-text">{summary.removedFileCount || 0}</dd>
                        </div>
                      </dl>

                      <div className="flex items-center justify-between gap-3 rounded-lg border border-cyber-border bg-cyber-surface-2/50 px-3 py-2 text-[11px]">
                        <span className="font-medium text-cyber-text-3">Diff total</span>
                        <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono tabular-nums">
                          <span className="text-emerald-300">+{formatNumber(totalAddedLines)} lignes</span>
                          <span className="text-red-300">−{formatNumber(totalRemovedLines)} lignes</span>
                        </span>
                      </div>
                    </>
                  ) : null}

                  {changes.length > 0 ? (
                    <section aria-labelledby="refresh-summary-changes">
                      <h3 id="refresh-summary-changes" className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyber-text-3">
                        Toutes les différences
                      </h3>
                      <div
                        className="max-h-[166px] overflow-y-auto rounded-lg border border-cyber-border bg-cyber-surface-2/50"
                        tabIndex={0}
                      >
                        <ul className="divide-y divide-cyber-border/70">
                          {changes.map((change) => (
                            <li key={`${change.kind}:${change.path}`} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <span className="min-w-0 flex-1 truncate font-mono text-cyber-text-2" title={change.path}>{change.path}</span>
                              <span className="hidden text-[10px] text-cyber-text-3 sm:inline">{refreshKinds[change.kind] || 'Modifié'}</span>
                              <span className="font-mono tabular-nums text-emerald-300">+{change.addedLines || 0}</span>
                              <span className="font-mono tabular-nums text-red-300">−{change.removedLines || 0}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  ) : null}
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </ModalPortal>
  );
}

export default function Header({ onShowHelp }) {
  const handleOpenLocal = useStore((s) => s.handleOpenLocal);
  const resetProject = useStore((s) => s.resetProject);
  const isScanning = useStore((s) => s.isScanning);
  const handleRefresh = useStore((s) => s.handleRefresh);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState(null);
  const refreshButtonRef = useRef(null);
  const [toast, showToast] = useToast();

  const doRefresh = async () => {
    if (refreshing || isScanning) return;
    setRefreshing(true);
    setRefreshSummary(null);
    try {
      const result = await handleRefresh();
      if (result?.refreshSummary) {
        setRefreshSummary(result.refreshSummary);
      }
      if (!result?.ok && !result?.aborted) {
        showToast(result.error?.message || "Échec de l'actualisation.", 'error');
      }
    } catch (err) {
      showToast(err?.message || "Échec de l'actualisation.", 'error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="app-header h-14 flex items-center justify-between px-4 md:px-5 border-b border-cyber-border flex-shrink-0"
    >
      {/* Left: logo + name only */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={resetProject}
          disabled={isScanning}
          title="Retour à l'écran d'accueil"
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-cyber-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyber-accent/10">
            <ContextPackerMark className="w-3.5 h-3.5 text-cyber-accent" />
          </div>
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">
            <span className="text-cyber-text">Context</span>
            <span className="text-cyber-accent">Packer</span>
          </span>
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Refresh */}
        <button
          ref={refreshButtonRef}
          onClick={doRefresh}
          disabled={isScanning || refreshing}
          title="Actualiser le projet"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-accent hover:bg-cyber-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Actualiser</span>
        </button>

        {/* Keyboard help */}
        <button
          type="button"
          data-testid="shortcut-help-button"
          onClick={onShowHelp}
          title="Raccourcis clavier (?)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-accent hover:bg-cyber-surface-2 transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Raccourcis</span>
        </button>

        <button
          onClick={handleOpenLocal}
          disabled={isScanning}
          title="Ouvrir un dossier local"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-cyber-accent hover:bg-cyber-accent/10 border border-cyber-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Ouvrir local</span>
        </button>

        <SettingsPanel />
      </div>
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
      </motion.header>
      <RefreshSummaryDialog
        summary={refreshSummary}
        onClose={() => setRefreshSummary(null)}
        restoreFocusRef={refreshButtonRef}
      />
    </>
  );
}
