/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: 'var(--cp-bg)',
          surface: 'var(--cp-surface)',
          'surface-2': 'var(--cp-surface-2)',
          border: 'var(--cp-border)',
          accent: '#22c55e',
          'accent-dim': 'rgba(34,197,94,0.55)',
          'accent-glow': 'rgba(34,197,94,0.15)',
          text: 'var(--cp-text)',
          'text-2': 'var(--cp-text-2)',
          'text-3': 'var(--cp-text-3)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'scan-line': 'scan-line 4s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(34,197,94,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.12)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
