import { useEffect } from 'react';
import { useStore } from '../store';

export function useKeyboardShortcuts() {
  const hasProject = useStore((s) => s.files.length > 0);
  const selectAll = useStore((s) => s.selectAll);
  const deselectAll = useStore((s) => s.deselectAll);
  const resetProject = useStore((s) => s.resetProject);
  const cancelWarning = useStore((s) => s.cancelWarning);
  const showWarning = useStore((s) => s.showWarning);

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

      // Escape → close warning popup or go back to welcome
      if (e.key === 'Escape' && !isEditable) {
        if (showWarning) {
          e.preventDefault();
          cancelWarning();
          return;
        }
        // If no warning, could clear search or go back — but Escape is overloaded.
        // We only handle warning dismissal here.
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasProject, selectAll, deselectAll, resetProject, cancelWarning, showWarning]);
}
