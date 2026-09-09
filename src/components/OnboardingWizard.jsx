import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, FileStack, FolderOpen, X } from 'lucide-react';
import ContextPackerMark from './ContextPackerMark';
import ModalPortal from './ModalPortal';

const STEPS = [
  {
    title: 'Ouvrir un dossier',
    icon: FolderOpen,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-cyber-text-2">
        <p>ContextPacker transforme un dossier local en contexte prêt à copier dans votre IA.</p>
        <ul className="space-y-1.5">
          <li>Sélectionnez un dossier local.</li>
          <li>Glissez-déposez un dossier sur la page d'accueil.</li>
          <li>Le scan reste dans votre navigateur.</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Sélectionner les fichiers',
    icon: FileStack,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-cyber-text-2">
        <p>Gardez uniquement les fichiers utiles pour votre contexte.</p>
        <ul className="space-y-1.5">
          <li>Parcourez l'arborescence dans le panneau latéral.</li>
          <li>Recherchez un fichier avec <kbd className="rounded bg-cyber-surface-2 px-1 py-0.5 font-mono text-[11px]">Ctrl+F</kbd>.</li>
          <li>Sélectionnez par extension ou avec <kbd className="rounded bg-cyber-surface-2 px-1 py-0.5 font-mono text-[11px]">Ctrl+A</kbd>.</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Exporter vers une IA',
    icon: ExternalLink,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-cyber-text-2">
        <p>Copiez ou téléchargez le contexte généré.</p>
        <ul className="space-y-1.5">
          <li>Utilisez le format texte ou Markdown.</li>
          <li>Activez <strong className="text-cyber-text">Formatage compact</strong> pour réduire les séparateurs et les espaces inutiles.</li>
          <li>Collez ensuite le résultat dans votre outil IA.</li>
        </ul>
      </div>
    ),
  },
];

export default function OnboardingWizard({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setStep(0);
    const timer = setTimeout(() => closeRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const finish = () => {
    onComplete?.();
    onClose();
  };
  const CurrentIcon = STEPS[step].icon;

  return (
    <ModalPortal isOpen={isOpen} onClose={finish} zIndex={250}>
      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] bg-slate-900/25 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div
              className="fixed inset-0 z-[251] grid place-items-center p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) finish();
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-xl border border-cyber-border bg-cyber-surface shadow-2xl"
                data-testid="onboarding-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Présentation de ContextPacker"
              >
                <div className="flex items-center gap-3 border-b border-cyber-border px-5 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyber-accent/10">
                    <ContextPackerMark className="h-4 w-4 text-cyber-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-cyber-text">Bienvenue dans ContextPacker</h3>
                    <p className="text-[10px] text-cyber-text-3">{step + 1} / {STEPS.length} - {STEPS[step].title}</p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={finish}
                    className="rounded-lg p-1.5 text-cyber-text-3 transition-colors hover:bg-cyber-surface-2 hover:text-cyber-text"
                    aria-label="Fermer la présentation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyber-accent/10">
                      <CurrentIcon className="h-5 w-5 text-cyber-accent" aria-hidden="true" />
                    </div>
                    <h4 className="text-base font-semibold text-cyber-text">{STEPS[step].title}</h4>
                  </div>
                  {STEPS[step].content}
                </div>

                <div className="flex items-center justify-between border-t border-cyber-border bg-cyber-surface-2/50 px-5 py-3.5">
                  <div className="flex gap-1" aria-label="Progression de la présentation">
                    {STEPS.map((item, index) => (
                      <span key={item.title} className={`h-2 w-2 rounded-full ${index === step ? 'bg-cyber-accent' : 'bg-cyber-border'}`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={finish} className="rounded-lg px-3 py-1.5 text-xs text-cyber-text-3 hover:text-cyber-text">Passer</button>
                    {step > 0 ? (
                      <button type="button" onClick={() => setStep((value) => value - 1)} className="flex items-center gap-1 rounded-lg border border-cyber-border px-3 py-1.5 text-xs text-cyber-text-2 hover:border-cyber-accent/30 hover:text-cyber-accent">
                        <ChevronLeft className="h-3.5 w-3.5" /> Précédent
                      </button>
                    ) : null}
                    <button type="button" onClick={() => (step < STEPS.length - 1 ? setStep((value) => value + 1) : finish())} className="flex items-center gap-1 rounded-lg bg-cyber-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-cyber-accent/90">
                      {step < STEPS.length - 1 ? <>Suivant <ChevronRight className="h-3.5 w-3.5" /></> : 'Terminer'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </ModalPortal>
  );
}
