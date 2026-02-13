import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeRaw] = useState(() => {
    try {
      return localStorage.getItem('cp-theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [resolved, setResolved] = useState('light');

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setResolved(mq.matches ? 'dark' : 'light');
      const handler = (e) => setResolved(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    setResolved(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.classList.toggle('light', resolved === 'light');
  }, [resolved]);

  const setTheme = useCallback((t) => {
    setThemeRaw(t);
    try { localStorage.setItem('cp-theme', t); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
