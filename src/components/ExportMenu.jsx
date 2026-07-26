import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clipboard,
  FileText,
  FileCode,
  ExternalLink,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { useToast } from '../hooks/useToast';
import { generatePlainOutput } from '../utils/outputFormatter';
import { generateMarkdownOutput } from '../utils/markdownFormatter';
import { countTokens } from '../utils/tokenCounter';
import { formatNumber } from '../utils/helpers';
import Toast from './Toast';

// ── Official brand SVG paths (source: simple-icons v16.27.0, CC0) ──
const BRAND_PATHS = {
  openai: 'M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 004.981 4.18a5.985 5.985 0 00-3.998 2.9 6.046 6.046 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.26 24a6.056 6.056 0 005.772-4.206 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.073zM13.26 22.43a4.476 4.476 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.6 18.304a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.771.771 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 19.95a4.5 4.5 0 01-6.14-1.646zM2.34 7.896a4.485 4.485 0 012.366-1.973V11.6a.766.766 0 00.388.676l5.815 3.355-2.02 1.168a.076.076 0 01-.071 0l-4.83-2.786A4.504 4.504 0 012.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 01.071 0l4.83 2.791a4.494 4.494 0 01-.676 8.105v-5.678a.79.79 0 00-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L9.409 9.23V6.897a.066.066 0 01.028-.061l4.83-2.787a4.5 4.5 0 016.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 01-.038-.057V6.075a4.5 4.5 0 017.375-3.453l-.142.08L8.704 5.46a.795.795 0 00-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5Z',
  anthropic: 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z',
  gemini: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81',
  perplexity: 'M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z',
};

function BrandIcon({ d, brandKey, color }) {
  const gradientId = `brand-gradient-${brandKey}`;

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {brandKey === 'gemini' ? (
        <defs>
          <linearGradient id={gradientId} x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4285F4" />
            <stop offset="0.5" stopColor="#9B72CB" />
            <stop offset="1" stopColor="#D96570" />
          </linearGradient>
        </defs>
      ) : null}
      <path d={d} fill={brandKey === 'gemini' ? `url(#${gradientId})` : color} />
    </svg>
  );
}

const LLM_TARGETS = [
  { key: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/', path: BRAND_PATHS.openai, color: '#10a37f', surface: 'rgba(16, 163, 127, 0.13)' },
  { key: 'claude', label: 'Claude', url: 'https://claude.ai/new', path: BRAND_PATHS.anthropic, color: '#d97757', surface: 'rgba(217, 119, 87, 0.14)' },
  { key: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app', path: BRAND_PATHS.gemini, color: '#8b78d8', surface: 'rgba(139, 120, 216, 0.14)' },
  { key: 'perplexity', label: 'Perplexity', url: 'https://www.perplexity.ai/', path: BRAND_PATHS.perplexity, color: '#20b8cd', surface: 'rgba(32, 184, 205, 0.14)' },
];

// ── Component ───────────────────────────────────────────────
export default function ExportMenu({
  projectName,
  selectedFiles,
  tree,
  selectedPaths,
  minifyEnabled,
  contentTokens,
  tokenLimit,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [activeTargetKey, setActiveTargetKey] = useState(null);
  const [toast, showToast] = useToast();
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Lazy generation — only build the output when the user asks for it
  const buildOutput = useCallback((format) => {
    if (selectedFiles.length === 0) return '';
    if (format === 'md') {
      return generateMarkdownOutput(
        projectName,
        selectedFiles,
        contentTokens,
        minifyEnabled,
        tree,
        selectedPaths
      );
    }
    return generatePlainOutput(
      projectName,
      selectedFiles,
      contentTokens,
      minifyEnabled,
      tree,
      selectedPaths
    );
  }, [projectName, selectedFiles, contentTokens, minifyEnabled, tree, selectedPaths]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const prepareOutput = useCallback((format) => {
    const output = buildOutput(format);
    if (!output) return '';

    const exportTokens = countTokens(output);
    if (tokenLimit > 0 && exportTokens > tokenLimit) {
      const shouldContinue = window.confirm(
        `L'export contient environ ${formatNumber(exportTokens)} tokens, au-dessus de votre limite de ${formatNumber(tokenLimit)}. Continuer ?`
      );
      if (!shouldContinue) return '';
    }
    return output;
  }, [buildOutput, tokenLimit]);

  const handleCopy = useCallback(async () => {
    const output = prepareOutput('txt');
    if (!output) return;
    const ok = await copyToClipboard(output);
    const exportTokens = countTokens(output);
    showToast(
      ok
        ? `Contexte copié — ${formatNumber(exportTokens)} tokens`
        : 'Échec de la copie.',
      ok ? 'success' : 'error'
    );
    setOpen(false);
  }, [prepareOutput, showToast]);

  const handleDownload = useCallback((format) => {
    const output = prepareOutput(format);
    if (!output) return;
    const ext = format === 'md' ? 'md' : 'txt';
    const mime = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'context'}-packed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const exportTokens = countTokens(output);
    showToast(
      `Fichier .${ext} généré — ${formatNumber(exportTokens)} tokens`,
      'success'
    );
    setOpen(false);
  }, [prepareOutput, projectName, showToast]);

  const handleLLM = useCallback((target) => {
    const output = prepareOutput('txt');
    if (!output) return;
    setActiveTargetKey(target.key);
    // Reserve the popup during the user gesture, then navigate after copying.
    const newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');

    copyToClipboard(output).then((ok) => {
      const exportTokens = countTokens(output);
      if (!ok && newWindow && !newWindow.closed) newWindow.close();
      if (ok && newWindow && !newWindow.closed) newWindow.location.href = target.url;
      showToast(
        ok
          ? `Contexte copié (${formatNumber(exportTokens)} tokens). Collez dans ${target.label}.`
          : 'Échec de la copie.',
        ok ? 'success' : 'error'
      );
      if (!newWindow || newWindow.closed) {
        showToast(
          `Popup bloquée. Ouvrez ${target.label} manuellement.`,
          'error'
        );
      }
      setActiveTargetKey(null);
    });
    setOpen(false);
  }, [prepareOutput, showToast]);

  return (
    <>
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="true"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/25 hover:bg-cyber-accent/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Exporter le contexte"
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Exporter</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full right-0 mb-1.5 w-56 rounded-xl border border-cyber-border shadow-xl z-50 overflow-hidden"
              style={{ background: 'var(--cp-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)' }}
              role="menu"
            >
              <div className="px-1.5 pt-1.5 pb-0.5">
                <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyber-text-3">Enregistrer</p>
                <button onClick={handleCopy} disabled={disabled} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-cyber-text-2 hover:bg-cyber-surface-2 hover:text-cyber-accent transition-colors disabled:opacity-40" role="menuitem">
                  <Clipboard className="w-3.5 h-3.5" />Copier le contexte
                </button>
                <button onClick={() => handleDownload('txt')} disabled={disabled} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-cyber-text-2 hover:bg-cyber-surface-2 hover:text-cyber-accent transition-colors disabled:opacity-40" role="menuitem">
                  <FileText className="w-3.5 h-3.5" />Télécharger .txt
                </button>
                <button onClick={() => handleDownload('md')} disabled={disabled} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-cyber-text-2 hover:bg-cyber-surface-2 hover:text-cyber-accent transition-colors disabled:opacity-40" role="menuitem">
                  <FileCode className="w-3.5 h-3.5" />Télécharger .md
                </button>
              </div>
              <div className="mx-3 h-px bg-cyber-border" />
              <div className="px-1.5 pt-1 pb-1.5">
                <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyber-text-3">Copier puis ouvrir</p>
                <p className="px-2.5 pb-1.5 text-[10px] leading-relaxed text-cyber-text-3">Le contexte est copié automatiquement avant l’ouverture.</p>
                {LLM_TARGETS.map((t) => (
                  <button key={t.key} onClick={() => handleLLM(t)} disabled={disabled || activeTargetKey !== null} aria-busy={activeTargetKey === t.key} aria-label={`Copier puis ouvrir dans ${t.label}`} title={`Copier puis ouvrir dans ${t.label}`} className="group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-cyber-text-2 hover:bg-cyber-surface-2 hover:text-cyber-text transition-colors disabled:opacity-45 disabled:cursor-not-allowed" role="menuitem">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md" style={{ color: t.color, background: t.surface }}>
                      <BrandIcon d={t.path} brandKey={t.key} color={t.color} />
                    </span>
                    <span>{t.label}</span>
                    {activeTargetKey === t.key ? (
                      <Loader2 className="w-3 h-3 ml-auto animate-spin text-cyber-text-3" />
                    ) : (
                      <ExternalLink className="w-3 h-3 ml-auto text-cyber-text-3 group-hover:text-cyber-text-2" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
    </>
  );
}
