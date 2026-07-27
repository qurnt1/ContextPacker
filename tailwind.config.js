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
          accent: 'var(--cp-accent)',
          'accent-dim': 'color-mix(in srgb, var(--cp-accent) 55%, transparent)',
          'accent-glow': 'var(--cp-accent-soft)',
          text: 'var(--cp-text)',
          'text-2': 'var(--cp-text-2)',
          'text-3': 'var(--cp-text-3)',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--cp-radius)',
        lg: 'var(--cp-radius-lg)',
        sm: 'var(--cp-radius-sm)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(34,197,94,0.15)' },
          '50%': { boxShadow: '0 0 24px rgba(34,197,94,0.25), 0 0 48px rgba(34,197,94,0.08)' },
        },
      },
    },
  },
  plugins: [],
};
