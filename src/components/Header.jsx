import { AnimatePresence, motion } from 'motion/react';
import { FolderOpen, Loader2, Keyboard, RefreshCw, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStore } from '../store';
import { useToast } from '../hooks/useToast';
import SettingsPanel from './SettingsPanel';
import Toast from './Toast';
import ContextPackerMark from './ContextPackerMark';
import ModalPortal from './ModalPortal';
import RefreshChangesList from './RefreshChangesList';
import { formatNumber } from '../utils/helpers';

const refreshDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function parseRefreshDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function RefreshSummaryDialog({ summary, onClose, restoreFocusRef }) {
  const latestModified = parseRefreshDate(summary?.latestModifiedAt);
  const changedCount = summary?.totalChanged || 0;
  const totalAddedLines = summary?.totalAddedLines || 0;
  const totalRemovedLines = summary?.totalRemovedLines || 0;
  const hasChanges = changedCount > 0 || (summary?.changeGroups?.length || 0) > 0;

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
                className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-cyber-border bg-cyber-surface shadow-2xl"
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
                        : `${changedCount} changement${changedCount > 1 ? 's' : ''} détecté${changedCount > 1 ? 's' : ''}.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-cyber-text-3 transition-colors hover:bg-cyber-surface-2 hover:text-cyber-text"
                    aria-label="Fermer le résumé d’actualisation"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
                  {latestModified ? (
                    <p className="text-xs text-cyber-text-2">
                      Dernier fichier modifié : <time dateTime={latestModified.toISOString()} className="font-medium text-cyber-text">{refreshDateFormatter.format(latestModified)}</time>
                    </p>
                  ) : null}

                  {changedCount > 0 ? (
                    <>
                      <dl className="grid grid-cols-1 gap-2 text-center text-[11px] sm:grid-cols-3">
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

                  {hasChanges ? <RefreshChangesList summary={summary} /> : null}
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

  const doOpenLocal = async () => {
    if (isScanning) return;
    const result = await handleOpenLocal();
    if (!result?.ok && !result?.aborted) {
      showToast(result?.error?.message || "Impossible d'ouvrir ce dossier.", 'error');
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
          type="button"
          onClick={resetProject}
          disabled={isScanning}
          title="Retour à l'écran d'accueil"
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-cyber-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyber-accent/10">
            <ContextPackerMark className="h-6 w-6 text-cyber-accent" />
          </div>
          <span className="text-sm font-bold tracking-tight whitespace-nowrap">
            <span className="text-cyber-text">Copy</span>
            <span className="text-cyber-accent">ForAI</span>
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
          type="button"
          onClick={() => { void doOpenLocal(); }}
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
