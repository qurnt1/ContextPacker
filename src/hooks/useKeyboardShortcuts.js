import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';

export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const hasProject = useStore((s) => s.files.length > 0);
  const selectAll = useStore((s) => s.selectAll);
  const deselectAll = useStore((s) => s.deselectAll);
  const resetProject = useStore((s) => s.resetProject);
  const cancelWarning = useStore((s) => s.cancelWarning);
  const showWarning = useStore((s) => s.showWarning);

  const openHelp = useCallback(() => setShowHelp(true), []);
  const closeHelp = useCallback(() => setShowHelp(false), []);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;

      // Ctrl+F → focus search input (when project is loaded, not in editable field)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && hasProject && !isEditable) {
        e.preventDefault();
        if (window.__cpSearchInputRef?.current) {
          window.__cpSearchInputRef.current.focus();
          window.__cpSearchInputRef.current.select();
        }
        return;
      }

      // ? → toggle shortcut help (works globally when not editing)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Escape → close help modal, or warn popup, or reset project
      if (e.key === 'Escape' && !isEditable) {
        if (showHelp) {
          e.preventDefault();
          setShowHelp(false);
          return;
        }
        if (showWarning) {
          e.preventDefault();
          cancelWarning();
          return;
        }
        return;
      }

      if (!hasProject) return;

      // Ctrl+A → select all (only when not in an editable element)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey && !isEditable) {
        e.preventDefault();
        selectAll();
        return;
      }

      // Ctrl+Shift+A → deselect all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A' && !isEditable) {
        e.preventDefault();
        deselectAll();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasProject, selectAll, deselectAll, resetProject, cancelWarning, showWarning, showHelp]);

  return { showHelp, openHelp, closeHelp };
}
