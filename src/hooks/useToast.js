import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });
    timerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2200);
  }, []);

  return [toast, showToast];
}
