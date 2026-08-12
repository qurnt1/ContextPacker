import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, FileStack, ExternalLink, ChevronRight, ChevronLeft, X } from 'lucide-react';
import ContextPackerMark from './ContextPackerMark';
import ModalPortal from './ModalPortal';

const STEPS = [
  {
    title: 'Ouvrir un projet',
    icon: FolderOpen,
    content: (
      <div className="space-y-3 text-sm text-cyber-text-2 leading-relaxed">
        <p>ContextPacker transforme un dossier ou un dépôt GitHub en un contexte prêt pour votre IA.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Sélectionnez un <strong className="text-cyber-text">dossier local</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Glissez-déposez un dossier sur la page d&apos;accueil</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Ou chargez un <strong className="text-cyber-text">repository GitHub</strong> public</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Sélectionner les fichiers',
    icon: FileStack,
    content: (
      <div className="space-y-3 text-sm text-cyber-text-2 leading-relaxed">
        <p>Choisissez uniquement les fichiers pertinents pour votre LLM.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Parcourez l&apos;arborescence dans le panneau latéral</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Recherchez un fichier avec <kbd className="px-1 py-0.5 rounded bg-cyber-surface-2 border border-cyber-border text-[11px] font-mono">Ctrl+F</kbd></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Sélectionnez par extension (.js, .py, .tsx...)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Utilisez <kbd className="px-1 py-0.5 rounded bg-cyber-surface-2 border border-cyber-border text-[11px] font-mono">Ctrl+A</kbd> pour tout sélectionner</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Exporter vers un LLM',
    icon: ExternalLink,
    content: (
      <div className="space-y-3 text-sm text-cyber-text-2 leading-relaxed">
        <p>Une fois vos fichiers choisis, exportez le contexte généré.</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Copiez le contexte dans le presse-papier</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Téléchargez un fichier <code className="px-1 py-0.5 rounded bg-cyber-surface-2 text-[11px] font-mono">.txt</code> ou <code className="px-1 py-0.5 rounded bg-cyber-surface-2 text-[11px] font-mono">.md</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyber-accent mt-0.5">•</span>
            <span>Copiez le contexte, puis ouvrez <strong className="text-cyber-text">ChatGPT, Claude, Gemini ou Perplexity</strong> pour le coller</span>
          </li>
        </ul>
        <p className="text-xs text-cyber-text-3 mt-4">Tout le traitement reste dans votre navigateur. Aucun fichier n&apos;est envoyé à un serveur.</p>
      </div>
    ),
  },
];

export default function OnboardingWizard({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const closeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      const timer = setTimeout(() => closeRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const CurrentIcon = STEPS[step].icon;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={250}>
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 250 }}
            onClick={() => { onClose(); onComplete?.(); }}
          />
          <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-center justify-center"
              style={{ zIndex: 251 }}
              data-testid="onboarding-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Présentation de ContextPacker"
            >
              <div className="w-[440px] max-w-[92vw] max-h-[85vh] overflow-y-auto bg-cyber-surface border border-cyber-border rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-cyber-border">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyber-accent/10">
                    <ContextPackerMark className="w-4 h-4 text-cyber-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-cyber-text">Bienvenue dans ContextPacker</h3>
                    <p className="text-[10px] text-cyber-text-3">{step + 1} / {STEPS.length} — {STEPS[step].title}</p>
                  </div>
                  <button
                    ref={closeRef}
                    onClick={() => { onClose(); onComplete?.(); }}
                    className="p-1.5 rounded-lg hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text transition-colors"
                    aria-label="Fermer la présentation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Step icon + content */}
                <div className="px-5 py-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyber-accent/10 flex-shrink-0">
                      <CurrentIcon className="w-5 h-5 text-cyber-accent" />
                    </div>
                    <h4 className="text-base font-semibold text-cyber-text">{STEPS[step].title}</h4>
                  </div>
                  {STEPS[step].content}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-cyber-border bg-cyber-surface/50">
                  <div className="flex gap-1">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-cyber-accent' : 'bg-cyber-border'}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { onClose(); onComplete?.(); }}
                      className="px-3 py-1.5 text-xs rounded-lg text-cyber-text-3 hover:text-cyber-text transition-colors"
                    >
                      Passer
                    </button>
                    {step > 0 && (
                      <button
                        onClick={handlePrev}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-cyber-border text-cyber-text-2 hover:text-cyber-accent hover:border-cyber-accent/30 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Précédent
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg bg-cyber-accent text-black hover:bg-cyber-accent/90 transition-colors"
                    >
                      {step < STEPS.length - 1 ? (
                        <>
                          Suivant
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        'Terminer'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
}
