import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Info } from 'lucide-react';

export default function Toast({ message, visible, type = 'success', onDone }) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDone?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible, onDone]);

  const isSuccess = type === 'success';

  return createPortal(
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg pointer-events-auto"
          style={{
            background: 'var(--cp-surface)',
            border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.3)' : 'var(--cp-border)'}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          <div
            className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
            style={{
              background: isSuccess ? 'rgba(34,197,94,0.15)' : 'rgba(110,110,120,0.15)',
            }}
          >
            {isSuccess ? (
              <Check className="w-3 h-3" style={{ color: '#22c55e' }} />
            ) : (
              <Info className="w-3 h-3" style={{ color: 'var(--cp-text-3)' }} />
            )}
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--cp-text)' }}
          >
            {message}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
