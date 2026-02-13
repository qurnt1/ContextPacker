import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize theme class before first render to prevent flash
try {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const raw = localStorage.getItem('cp-theme');
  // cp-theme default is now 'light' if not set, or 'system' logic updated
  // BUT user asked for 'light' default on first visit.
  const theme = typeof raw === 'string' && ['dark', 'light', 'system'].includes(raw) ? raw : 'light';
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  document.documentElement.classList.add(resolved);
} catch {
  // Corrupted localStorage — fall back to light
  document.documentElement.classList.add('light');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
