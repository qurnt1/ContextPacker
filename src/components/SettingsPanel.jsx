import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FolderCog, Settings, X } from 'lucide-react';
import { DEFAULT_TOKEN_LIMITS } from '../constants';
import { useStore } from '../store';
import ModalPortal from './ModalPortal';

export default function SettingsPanel() {
  const tokenLimit = useStore((state) => state.tokenLimit);
  const setTokenLimit = useStore((state) => state.setTokenLimit);
  const warningPercent = useStore((state) => state.warningPercent);
  const setWarningPercent = useStore((state) => state.setWarningPercent);
  const gitignoreEnabled = useStore((state) => state.gitignoreEnabled);
  const setGitignoreEnabled = useStore((state) => state.setGitignoreEnabled);
  const isScanning = useStore((state) => state.isScanning);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const limits = DEFAULT_TOKEN_LIMITS?.length
    ? DEFAULT_TOKEN_LIMITS
    : [32_000, 64_000, 128_000, 200_000, 500_000, 1_000_000];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        title="Paramètres"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-cyber-text-2 transition-colors hover:bg-cyber-surface-2 hover:text-cyber-accent"
      >
        <Settings className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Paramètres</span>
      </button>

      <ModalPortal isOpen={isOpen} onClose={() => setIsOpen(false)} zIndex={9998} restoreFocusRef={triggerRef}>
        <AnimatePresence>
          {isOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => setIsOpen(false)}
                className="mobile-panel-backdrop fixed inset-0 z-[9998]"
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-0 right-0 top-0 z-[9999] flex w-full max-w-none flex-col border-l border-cyber-border bg-cyber-surface shadow-2xl sm:max-w-[380px]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
              >
                <div className="flex items-center justify-between border-b border-cyber-border px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-cyber-accent/10 p-1.5 text-cyber-accent">
                      <Settings className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <h2 id="settings-title" className="text-sm font-semibold text-cyber-text">Paramètres</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Fermer"
                    className="rounded-lg p-1.5 text-cyber-text-3 transition-colors hover:bg-cyber-surface-2 hover:text-cyber-text"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 space-y-7 overflow-y-auto overscroll-contain p-5">
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-text">Limite de tokens</h3>
                    <p className="mb-3 mt-1 text-[11px] leading-normal text-cyber-text-3">
                      Capacité maximale du contexte que vous préparez.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {limits.map((limit) => {
                        const label = limit >= 1_000_000 ? `${limit / 1_000_000}M` : `${limit / 1_000}k`;
                        const active = tokenLimit === limit;
                        return (
                          <button
                            key={limit}
                            type="button"
                            onClick={() => setTokenLimit(limit)}
                            className={`rounded-lg border px-3 py-2 text-xs font-mono font-medium transition-colors ${active
                              ? 'border-cyber-accent/25 bg-cyber-accent/10 text-cyber-accent'
                              : 'border-transparent bg-cyber-surface-2 text-cyber-text-2 hover:border-cyber-border'}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="border-t border-cyber-border/60 pt-6">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-text">Seuil d'alerte</h3>
                        <p className="mt-1 max-w-[220px] text-[11px] text-cyber-text-3">Afficher une confirmation avant de dépasser ce pourcentage.</p>
                      </div>
                      <output className="rounded bg-cyber-accent/10 px-2 py-1 font-mono text-sm font-bold text-cyber-accent">{warningPercent}%</output>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={warningPercent}
                      onChange={(event) => setWarningPercent(Number(event.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-cyber-surface-2 accent-cyber-accent"
                      aria-label="Seuil d'alerte en pourcentage"
                    />
                  </section>

                  <section className="border-t border-cyber-border/60 pt-6">
                    <div className="flex items-start gap-3">
                      <FolderCog className="mt-0.5 h-4 w-4 shrink-0 text-cyber-accent" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyber-text">Filtres du dossier</h3>
                        <p className="mt-1 text-[11px] leading-normal text-cyber-text-3">
                          Les dossiers `.git`, `venv`, `.aws` et `.ssh`, ainsi que les fichiers `.env*`, les clés privées et `credentials.json`, restent toujours exclus. Le fichier `.gitignore` complète ces filtres.
                        </p>
                        <label className="mt-3 flex items-center gap-2 text-xs text-cyber-text-2">
                          <input
                            type="checkbox"
                            checked={gitignoreEnabled}
                            disabled={isScanning}
                            onChange={(event) => setGitignoreEnabled(event.target.checked)}
                            className="h-4 w-4 accent-cyber-accent"
                          />
                          Respecter `.gitignore`
                        </label>
                      </div>
                    </div>
                  </section>

                  <div className="border border-cyber-accent/15 bg-cyber-accent/[0.04] p-4">
                    <p className="text-[11px] leading-relaxed text-cyber-text-2">
                      ContextPacker traite les fichiers en local dans votre navigateur. Aucun de vos fichiers n'est envoyé vers un serveur distant.
                    </p>
                  </div>
                </div>

                <div className="border-t border-cyber-border p-4 text-center text-[10px] text-cyber-text-3">
                  Les réglages sont sauvegardés sur cet appareil.
                </div>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
      </ModalPortal>
    </>
  );
}
