import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import { isSelectionAllowed } from '../utils/filePolicy';
import { useStore } from '../store';
import ModalPortal from './ModalPortal';

export default function WarningPopup() {
  const isOpen = useStore((state) => state.showWarning);
  const pendingPaths = useStore((state) => state.pendingPaths);
  const selectedPaths = useStore((state) => state.selectedPaths);
  const files = useStore((state) => state.files);
  const minifyEnabled = useStore((state) => state.minifyEnabled);
  const tokenLimit = useStore((state) => state.tokenLimit);
  const warningPercent = useStore((state) => state.warningPercent);
  const confirmWarning = useStore((state) => state.confirmWarning);
  const cancelWarning = useStore((state) => state.cancelWarning);
  const warningKind = useStore((state) => state.warningKind);
  const isSettingsWarning = warningKind === 'settings';
  const paths = pendingPaths || selectedPaths;

  const totalTokens = useMemo(() => files
    .filter((file) => isSelectionAllowed(file) && paths?.has(file.path))
    .reduce((sum, file) => sum + (minifyEnabled ? file.minifiedTokens : file.tokens), 0),
  [files, paths, minifyEnabled]);

  const percentUsed = tokenLimit > 0 ? ((totalTokens / tokenLimit) * 100).toFixed(1) : '0.0';
  const message = `Le total (${formatNumber(totalTokens)} tokens) dépasse ${warningPercent}% de votre limite de ${formatNumber(tokenLimit)} tokens.`;

  return (
    <ModalPortal isOpen={isOpen} onClose={cancelWarning} zIndex={200}>
      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-900/30 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div
              className="fixed inset-0 z-[201] grid place-items-center p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) cancelWarning();
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="w-full max-w-[420px] overflow-hidden rounded-xl border border-cyber-border bg-cyber-surface shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="warning-popup-title"
              >
                <div className="flex items-center gap-3 border-b border-cyber-border px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <AlertTriangle className="h-[18px] w-[18px] text-amber-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="warning-popup-title" className="text-sm font-semibold text-cyber-text">
                      {isSettingsWarning ? 'Seuil modifié' : 'Volume important'}
                    </h3>
                    <p className="text-[11px] text-cyber-text-3">
                      {isSettingsWarning ? 'La sélection actuelle dépasse le nouveau seuil.' : `${percentUsed}% de la limite`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelWarning}
                    aria-label="Fermer"
                    className="ml-auto rounded-lg p-1.5 text-cyber-text-3 transition-colors hover:bg-cyber-surface-2 hover:text-cyber-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 px-5 py-4">
                  <p className="text-xs leading-relaxed text-cyber-text-2">{message}</p>
                  <p className="text-xs text-cyber-text-3">
                    {isSettingsWarning
                      ? 'Vous pouvez poursuivre, mais le contexte dépasse le seuil configuré.'
                      : 'Voulez-vous continuer avec cette sélection ?'}
                  </p>
                </div>

                <div className="flex gap-2.5 border-t border-cyber-border bg-cyber-surface-2/50 px-5 py-4">
                  <button
                    type="button"
                    onClick={cancelWarning}
                    className="flex-1 rounded-lg border border-cyber-border bg-cyber-surface-2 px-4 py-2.5 text-xs font-medium text-cyber-text-2 transition-colors hover:border-cyber-text-3 hover:text-cyber-text"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={isSettingsWarning ? cancelWarning : confirmWarning}
                    className="flex-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20"
                  >
                    {isSettingsWarning ? 'Fermer' : 'Continuer'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </ModalPortal>
  );
}
