import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import { useStore } from '../store';
import { isSelectableFile } from '../utils/securityPolicy';

export default function WarningPopup() {
  const isOpen = useStore((s) => s.showWarning);
  const pendingPaths = useStore((s) => s.pendingPaths);
  const files = useStore((s) => s.files);
  const minifyEnabled = useStore((s) => s.minifyEnabled);
  const tokenLimit = useStore((s) => s.tokenLimit);
  const warningPercent = useStore((s) => s.warningPercent);
  const customThreshold = useStore((s) => s.customThreshold);
  const confirmWarning = useStore((s) => s.confirmWarning);
  const cancelWarning = useStore((s) => s.cancelWarning);
  const warningKind = useStore((s) => s.warningKind);
  const isSettingsWarning = warningKind === 'settings';

  const totalTokens = useMemo(() => {
    if (!pendingPaths) return 0;
    return files
      .filter((f) => isSelectableFile(f) && pendingPaths.has(f.path))
      .reduce((sum, f) => sum + (minifyEnabled ? f.minifiedTokens : f.tokens), 0);
  }, [pendingPaths, files, minifyEnabled]);

  const percentUsed = tokenLimit > 0 ? ((totalTokens / tokenLimit) * 100).toFixed(1) : '0.0';
  const reasons = [];
  if (!isSettingsWarning && totalTokens > (tokenLimit * warningPercent) / 100) {
    reasons.push(`Le total (${formatNumber(totalTokens)} tokens) dépasse ${warningPercent}% de votre limite de ${formatNumber(tokenLimit)} tokens.`);
  }
  if (!isSettingsWarning && customThreshold > 0 && totalTokens > customThreshold) {
    reasons.push(`Le total dépasse votre seuil manuel de ${formatNumber(customThreshold)} tokens.`);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            onClick={cancelWarning}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[90vw] bg-cyber-surface border border-cyber-border rounded-2xl shadow-2xl z-[201] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="warning-popup-title"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-cyber-border">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/10">
                <AlertTriangle className="w-[18px] h-[18px] text-amber-400" />
              </div>
              <div>
                <h3 id="warning-popup-title" className="text-sm font-semibold text-cyber-text">{isSettingsWarning ? 'Seuil modifié' : 'Volume important détecté'}</h3>
                <p className="text-[11px] text-cyber-text-3">{isSettingsWarning ? 'La sélection actuelle dépasse le nouveau seuil.' : `${percentUsed}% de la limite`}</p>
              </div>
              <button
                onClick={cancelWarning}
                className="ml-auto p-1.5 rounded-lg hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              {reasons.map((r, i) => (
                <p key={i} className="text-xs text-cyber-text-2 leading-relaxed">
                  {r}
                </p>
              ))}
              <p className="text-xs text-cyber-text-3 mt-2">
                {isSettingsWarning
                  ? 'Vous pouvez poursuivre, mais le contexte dépasse le seuil configuré.'
                  : 'Voulez-vous continuer avec cette sélection ?'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 px-5 py-4 border-t border-cyber-border bg-cyber-surface-2/50">
              <button
                onClick={cancelWarning}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-medium bg-cyber-surface-2 border border-cyber-border text-cyber-text-2 hover:text-cyber-text hover:border-cyber-text-3 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={isSettingsWarning ? cancelWarning : confirmWarning}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
              >
                {isSettingsWarning ? 'Fermer' : 'Continuer'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
