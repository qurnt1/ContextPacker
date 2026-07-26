import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Loader2, AlertTriangle, GitBranch } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function BranchSelector({
  branches,
  defaultBranch,
  selectedBranch,
  onChange,
  loading,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchQuery) return branches;
    const q = searchQuery.toLowerCase();
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, searchQuery]);

  const selectedLabel = useMemo(() => {
    if (selectedBranch === '') return `Branche par défaut — ${defaultBranch || ''}`;
    return selectedBranch;
  }, [selectedBranch, defaultBranch]);

  const handleSelect = useCallback((name) => {
    onChange(name);
    setOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const optionNames = useMemo(() => ['', ...filtered.map((branch) => branch.name)], [filtered]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setSearchQuery('');
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (current + delta + optionNames.length) % optionNames.length);
      return;
    }
    if (event.key === 'Enter' && optionNames.length > 0) {
      event.preventDefault();
      handleSelect(optionNames[activeIndex] ?? '');
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const active = listRef.current?.querySelector(`[data-branch-index="${activeIndex}"]`);
    if (typeof active?.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="branch-options"
        aria-label="Sélectionner une branche"
        className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm transition-colors text-left ${
          loading
            ? 'bg-cyber-surface-2 border border-cyber-border text-cyber-text-3 cursor-not-allowed'
            : 'bg-cyber-surface-2 border border-cyber-border text-cyber-text hover:border-cyber-accent/30 focus:outline-none focus:border-cyber-accent/50'
        }`}
      >
        <GitBranch className="w-4 h-4 text-cyber-accent/60 flex-shrink-0" />
        {loading ? (
          <span className="flex items-center gap-2 text-cyber-text-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Chargement des branches...
          </span>
        ) : error ? (
          <span className="flex items-center gap-1.5 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Erreur de chargement
          </span>
        ) : (
          <>
            <span className="flex-1 truncate text-xs">{selectedLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-cyber-text-3 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-cyber-border shadow-xl z-50 overflow-hidden"
            style={{ background: 'var(--cp-surface)' }}
            role="listbox"
            aria-label="Branches"
            id="branch-options"
          >
            {/* Search */}
            <div className="px-2 pt-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-cyber-text-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-controls="branch-options"
                  aria-activedescendant={`branch-option-${activeIndex}`}
                  placeholder="Filtrer les branches..."
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-md bg-cyber-surface-2 border border-cyber-border text-cyber-text placeholder:text-cyber-text-3/50 focus:outline-none focus:border-cyber-accent/40 transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div ref={listRef} className="max-h-56 overflow-y-auto py-1">
              {/* Default branch option */}
              <button
                type="button"
                role="option"
                aria-selected={selectedBranch === ''}
                id="branch-option-0"
                data-branch-index="0"
                onMouseEnter={() => setActiveIndex(0)}
                onClick={() => handleSelect('')}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  selectedBranch === ''
                    ? 'bg-cyber-accent/10 text-cyber-accent'
                    : 'text-cyber-text-2 hover:bg-cyber-surface-2'
                }`}
              >
                <span className="font-medium">Branche par défaut</span>
                <span className="text-cyber-text-3 ml-2">— {defaultBranch}</span>
              </button>

              <div className="mx-3 my-1 h-px bg-cyber-border" />

              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11px] text-cyber-text-3">
                  Aucune branche trouvée pour "{searchQuery}"
                </p>
              ) : (
                filtered.map((b, index) => (
                  <button
                    key={b.name}
                    type="button"
                    role="option"
                    aria-selected={selectedBranch === b.name}
                    id={`branch-option-${index + 1}`}
                    data-branch-index={index + 1}
                    onMouseEnter={() => setActiveIndex(index + 1)}
                    onClick={() => handleSelect(b.name)}
                    className={`w-full text-left px-3 py-1.5 transition-colors ${
                      selectedBranch === b.name
                        ? 'bg-cyber-accent/10 text-cyber-accent'
                        : 'text-cyber-text-2 hover:bg-cyber-surface-2'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs truncate ${selectedBranch === b.name ? 'text-cyber-accent' : 'text-cyber-text'}`}>
                        {b.name}
                      </span>
                      {b.isDefault && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-cyber-accent/10 text-cyber-accent font-medium flex-shrink-0">
                          défaut
                        </span>
                      )}
                      {b.protected && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium flex-shrink-0">
                          protégée
                        </span>
                      )}
                    </div>
                    {b.updatedAt && (
                      <p className="text-[10px] text-cyber-text-3 mt-0.5">
                        Dernier commit : {formatDate(b.updatedAt)}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
