import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Info } from 'lucide-react';
import { DEFAULT_TOKEN_LIMITS } from '../constants';

export default function SettingsPanel({
  tokenLimit,
  onChangeTokenLimit,
  warningPercent,
  onChangeWarningPercent,
  customThreshold,
  onChangeCustomThreshold,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Paramètres"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-cyber-text-2 hover:text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Paramètres</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[380px] bg-cyber-surface border-l border-cyber-border shadow-2xl z-[101] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-cyber-border">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-cyber-cyan" />
                  <h2 className="text-sm font-semibold text-cyber-text">Paramètres</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {/* Token Limit */}
                <section>
                  <label className="text-xs font-semibold uppercase tracking-wider text-cyber-text-3 mb-2 block">
                    Limite de tokens
                  </label>
                  <p className="text-[11px] text-cyber-text-3 mb-3">
                    Définit la capacité maximale de la fenêtre de contexte cible.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_TOKEN_LIMITS.map((limit) => {
                      const label =
                        limit >= 1_000_000
                          ? `${limit / 1_000_000}M`
                          : `${limit / 1_000}k`;
                      const isActive = tokenLimit === limit;
                      return (
                        <button
                          key={limit}
                          onClick={() => onChangeTokenLimit(limit)}
                          className={`px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                            isActive
                              ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40'
                              : 'bg-cyber-surface-2 text-cyber-text-3 border border-transparent hover:border-cyber-border hover:text-cyber-text-2'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Warning threshold percent */}
                <section>
                  <label className="text-xs font-semibold uppercase tracking-wider text-cyber-text-3 mb-2 block">
                    Seuil d'alerte (%)
                  </label>
                  <p className="text-[11px] text-cyber-text-3 mb-3">
                    Affiche un avertissement quand le total dépasse ce pourcentage de la limite.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={warningPercent}
                      onChange={(e) => onChangeWarningPercent(Number(e.target.value))}
                      className="flex-1 accent-[#00e5ff] h-1.5"
                    />
                    <span className="font-mono text-sm text-cyber-cyan w-12 text-right tabular-nums">
                      {warningPercent}%
                    </span>
                  </div>
                </section>

                {/* Custom absolute threshold */}
                <section>
                  <label className="text-xs font-semibold uppercase tracking-wider text-cyber-text-3 mb-2 block">
                    Seuil manuel (tokens)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-cyber-text-3">
                      <Info className="w-3 h-3" />
                      <span className="text-[10px]">0 = désactivé</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={customThreshold}
                    onChange={(e) => onChangeCustomThreshold(Math.max(0, Number(e.target.value)))}
                    className="mt-2 w-full px-3 py-2 rounded-lg text-xs font-mono bg-cyber-surface-2 border border-cyber-border text-cyber-text placeholder-cyber-text-3 focus:outline-none focus:border-cyber-cyan/50 transition-colors"
                    placeholder="ex: 50000"
                  />
                </section>

                {/* Info box */}
                <div className="rounded-lg bg-cyber-cyan/5 border border-cyber-cyan/15 p-3">
                  <p className="text-[11px] text-cyber-text-2 leading-relaxed">
                    <strong className="text-cyber-cyan">Popup de confirmation :</strong> Une alerte
                    apparaîtra si le total de tokens dépasse{' '}
                    <span className="font-mono text-cyber-cyan">{warningPercent}%</span> de la limite
                    {customThreshold > 0 && (
                      <>
                        {' '}ou si le total dépasse{' '}
                        <span className="font-mono text-cyber-cyan">
                          {customThreshold.toLocaleString('fr-FR')}
                        </span>{' '}
                        tokens
                      </>
                    )}
                    .
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-cyber-border">
                <p className="text-[10px] text-cyber-text-3 text-center">
                  Tous les paramètres sont sauvegardés automatiquement.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
