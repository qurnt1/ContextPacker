import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize dark class based on system preference before first render
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('cp-theme');
const theme = savedTheme ? JSON.parse(savedTheme) : 'system';
const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
document.documentElement.classList.add(resolved);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
