import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Ensure defaults if missing
  const limits = DEFAULT_TOKEN_LIMITS && DEFAULT_TOKEN_LIMITS.length > 0
    ? DEFAULT_TOKEN_LIMITS
    : [32000, 64000, 128000, 200000, 500000, 1000000];

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

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                style={{ zIndex: 9998 }}
              />

              {/* Panel */}
              <motion.div
                key="panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-[380px] bg-cyber-surface border-l border-cyber-border shadow-2xl flex flex-col"
                style={{ zIndex: 9999 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-cyber-border bg-cyber-surface flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyber-cyan/10 text-cyber-cyan">
                      <Settings className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-semibold text-cyber-text">Paramètres</h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 -mr-2 rounded-lg hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* 1. Token Limit */}
                  <section>
                    <div className="mb-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-cyber-text font-mono">
                        Limite de tokens
                      </label>
                      <p className="text-[11px] text-cyber-text-3 mt-1 leading-normal">
                        Définit la capacité maximale de la fenêtre de contexte cible.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2.5">
                      {limits.map((limit) => {
                        const label = limit >= 1_000_000
                          ? `${limit / 1_000_000}M`
                          : `${limit / 1_000}k`;
                        const isActive = tokenLimit === limit;
                        return (
                          <button
                            key={limit}
                            onClick={() => onChangeTokenLimit(limit)}
                            className={`
                              px-3 py-2.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 border
                              ${isActive
                                ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/30 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                                : 'bg-cyber-surface-2 text-cyber-text-2 border-transparent hover:border-cyber-border hover:bg-cyber-surface-2/80'
                              }
                            `}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <div className="h-px bg-cyber-border/50" />

                  {/* 2. Warning Threshold */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-cyber-text font-mono">
                          Seuil d'alerte (%)
                        </label>
                        <p className="text-[11px] text-cyber-text-3 mt-1 leading-normal max-w-[200px]">
                          Affiche un avertissement quand le total dépasse ce pourcentage de la limite.
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-cyber-cyan bg-cyber-cyan/10 px-2 py-1 rounded">
                        {warningPercent}%
                      </span>
                    </div>

                    <div className="relative h-6 flex items-center">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={warningPercent}
                        onChange={(e) => onChangeWarningPercent(Number(e.target.value))}
                        className="w-full h-1.5 bg-cyber-surface-2 rounded-lg appearance-none cursor-pointer accent-cyber-cyan hover:accent-cyber-cyan/80 focus:outline-none focus:ring-2 focus:ring-cyber-cyan/30"
                      />
                    </div>
                  </section>

                  <div className="h-px bg-cyber-border/50" />

                  {/* 3. Custom Threshold */}
                  <section>
                    <div className="mb-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-cyber-text font-mono">
                        Seuil manuel (tokens)
                      </label>
                      <div className="flex items-center gap-1.5 mt-1 text-cyber-text-3">
                        <Info className="w-3 h-3" />
                        <span className="text-[10px]">0 = désactivé</span>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={customThreshold}
                        onChange={(e) => onChangeCustomThreshold(Math.max(0, Number(e.target.value)))}
                        className="w-full pl-4 pr-4 py-2.5 rounded-lg text-xs font-mono
                                 bg-cyber-surface-2 border border-cyber-border text-cyber-text
                                 placeholder-cyber-text-3/50 
                                 focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/20
                                 transition-colors"
                        placeholder="Ex: 50000"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-cyber-text-3 font-mono pointer-events-none">
                        tokens
                      </div>
                    </div>
                  </section>

                  {/* 4. Info Box */}
                  <div className="bg-cyber-cyan/5 border border-cyber-cyan/10 rounded-xl p-4">
                    <p className="text-[11px] text-cyber-text-2 leading-relaxed">
                      <strong className="text-cyber-cyan font-semibold block mb-1">Popup de confirmation :</strong>
                      Une alerte apparaîtra si le total de tokens dépasse{' '}
                      <span className="font-mono text-cyber-cyan font-bold bg-cyber-cyan/10 px-1 rounded">{warningPercent}%</span>{' '}
                      de la limite
                      {customThreshold > 0 && (
                        <>
                          {' '}ou si le total dépasse{' '}
                          <span className="font-mono text-cyber-cyan font-bold bg-cyber-cyan/10 px-1 rounded">
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
                <div className="p-4 border-t border-cyber-border bg-cyber-surface flex-shrink-0">
                  <p className="text-[10px] text-cyber-text-3 text-center flex items-center justify-center gap-2 opacity-70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                    Tous les paramètres sont sauvegardés automatiquement.
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
