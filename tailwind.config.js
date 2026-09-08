/** @type {import('tailwindcss').Config} */
export default {
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
          text: 'var(--cp-text)',
          'text-2': 'var(--cp-text-2)',
          'text-3': 'var(--cp-text-3)',
          success: 'var(--cp-success)',
          warning: 'var(--cp-warning)',
          danger: 'var(--cp-danger)',
        },
        copy: {
          bg: 'var(--cp-bg)',
          surface: 'var(--cp-surface)',
          'surface-2': 'var(--cp-surface-2)',
          border: 'var(--cp-border)',
          accent: 'var(--cp-accent)',
          text: 'var(--cp-text)',
          'text-2': 'var(--cp-text-2)',
          'text-3': 'var(--cp-text-3)',
          success: 'var(--cp-success)',
          warning: 'var(--cp-warning)',
          danger: 'var(--cp-danger)',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--cp-radius)',
        lg: 'var(--cp-radius-lg)',
        sm: 'var(--cp-radius-sm)',
      },
    },
  },
  plugins: [],
};
