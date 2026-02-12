/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050505',
          surface: '#0a0a12',
          'surface-2': '#12121e',
          border: '#1a1a2e',
          cyan: '#00e5ff',
          'cyan-dim': 'rgba(0,229,255,0.55)',
          'cyan-glow': 'rgba(0,229,255,0.15)',
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
          '0%, 100%': { boxShadow: '0 0 15px rgba(0,229,255,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0,229,255,0.4), 0 0 60px rgba(0,229,255,0.1)' },
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
