import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container) {
  return [...(container?.querySelectorAll(FOCUSABLE_SELECTOR) || [])]
    .filter((element) => element.getAttribute('aria-hidden') !== 'true');
}

export default function ModalPortal({ isOpen, onClose, children, zIndex = 200, restoreFocusRef }) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      previousFocusRef.current = document.activeElement;
      const frame = requestAnimationFrame(() => {
        const focusable = getFocusableElements(containerRef.current);
        focusable[0]?.focus();
      });
      document.body.style.overflow = 'hidden';
      wasOpenRef.current = true;

      return () => cancelAnimationFrame(frame);
    }

    if (!isOpen && wasOpenRef.current) {
      document.body.style.overflow = '';
      wasOpenRef.current = false;
      const target = restoreFocusRef?.current || previousFocusRef.current;
      if (target?.isConnected && typeof target.focus === 'function') target.focus();
      previousFocusRef.current = null;
    }

    return undefined;
  }, [isOpen, restoreFocusRef]);

  useEffect(() => () => {
    document.body.style.overflow = '';
  }, []);

  const handleKeyDown = (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(containerRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      className={`fixed inset-0 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ zIndex }}
      onKeyDown={handleKeyDown}
      aria-hidden={!isOpen}
    >
      {children}
    </div>,
    document.body
  );
}
