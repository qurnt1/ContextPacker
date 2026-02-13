import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { formatNumber } from '../utils/helpers';

export default function WarningPopup({ isOpen, totalTokens, tokenLimit, warningPercent, customThreshold, onConfirm, onCancel }) {
  const percentUsed = ((totalTokens / tokenLimit) * 100).toFixed(1);
  const reasons = [];
  if (totalTokens > (tokenLimit * warningPercent) / 100) {
    reasons.push(`Le total (${formatNumber(totalTokens)} tokens) dépasse ${warningPercent}% de votre limite de ${formatNumber(tokenLimit)} tokens.`);
  }
  if (customThreshold > 0 && totalTokens > customThreshold) {
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[90vw] bg-cyber-surface border border-amber-500/30 rounded-2xl shadow-2xl z-[201] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-300">Volume important détecté</h3>
                <p className="text-[11px] text-amber-400/70">{percentUsed}% de la limite atteint</p>
              </div>
              <button
                onClick={onCancel}
                className="ml-auto p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400/50 hover:text-amber-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              {reasons.map((r, i) => (
                <p key={i} className="text-xs text-cyber-text-2 leading-relaxed">
                  • {r}
                </p>
              ))}
              <p className="text-xs text-cyber-text-3 mt-2">
                Voulez-vous continuer avec cette sélection ?
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-cyber-border">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-medium bg-cyber-surface-2 text-cyber-text-2 hover:text-cyber-text transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
              >
                Continuer quand même
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
