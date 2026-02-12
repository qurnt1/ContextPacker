import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, Check } from 'lucide-react';

export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [text]);

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          : 'bg-cyber-surface neon-border text-cyber-cyan hover:bg-cyber-cyan/10 glow-cyan'
      }`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Copié !
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Clipboard className="w-3.5 h-3.5" />
            Copier dans le presse-papier
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
