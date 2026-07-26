import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');

const ctrl = isMac ? '⌘' : 'Ctrl';
const shift = isMac ? '⇧' : 'Shift';

const shortcuts = [
  { keys: [ctrl, 'A'], desc: 'Tout sélectionner' },
  { keys: [ctrl, shift, 'A'], desc: 'Tout désélectionner' },
  { keys: [ctrl, 'F'], desc: 'Rechercher dans les fichiers' },
  { keys: [`${shift} + Clic`], desc: 'Sélectionner une plage de fichiers' },
  { keys: ['Échap'], desc: 'Fermer les popups' },
  { keys: ['?'], desc: 'Afficher / masquer cette aide' },
];

export default function ShortcutHelp({ isOpen, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => closeRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 200 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[90vw] bg-cyber-surface border border-cyber-border rounded-2xl shadow-2xl overflow-hidden"
              style={{ zIndex: 201 }}
              data-testid="shortcut-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Raccourcis clavier"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-cyber-border">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyber-accent/10">
                  <Keyboard className="w-[18px] h-[18px] text-cyber-accent" />
                </div>
                <h3 className="text-sm font-semibold text-cyber-text">Raccourcis clavier</h3>
                <button
                  ref={closeRef}
                  onClick={onClose}
                  className="ml-auto p-1.5 rounded-lg hover:bg-cyber-surface-2 text-cyber-text-3 hover:text-cyber-text transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-2">
                {shortcuts.map(({ keys, desc }) => (
                  <div key={desc} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-cyber-text-2">{desc}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-[10px] text-cyber-text-3 mx-0.5">+</span>}
                          <kbd className="px-2 py-0.5 rounded text-xs font-mono bg-cyber-surface-2 border border-cyber-border text-cyber-text">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-cyber-border bg-cyber-surface/50">
                <p className="text-[10px] text-cyber-text-3 leading-relaxed">
                  {isMac
                    ? 'Raccourcis affichés pour macOS. Sur Windows/Linux, ⌘ correspond à Ctrl.'
                    : 'Raccourcis affichés pour Windows/Linux. Sur macOS, Ctrl correspond à ⌘.'}
                </p>
              </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
