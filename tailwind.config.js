/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          ink: '#ffffff',
        },
        'primary-dark': {
          DEFAULT: '#7dd3fc',
          ink: '#0f172a',
        },
        secondary: {
          DEFAULT: '#a855f7',
          ink: '#ffffff',
        },
        'secondary-dark': {
          DEFAULT: '#d8b4fe',
          ink: '#0f172a',
        },
        surface: {
          DEFAULT: '#f8fafc',
          alt: '#ffffff',
        },
        'surface-dark': {
          DEFAULT: '#0f172a',
          alt: '#1e293b',
        },
        ink: {
          DEFAULT: '#1e293b',
          muted: '#64748b',
          faint: '#94a3b8',
        },
        'ink-dark': {
          DEFAULT: '#f1f5f9',
          muted: '#94a3b8',
          faint: '#64748b',
        },
        border: {
          DEFAULT: '#e2e8f0',
          bold: '#1e293b',
        },
        'border-dark': {
          DEFAULT: '#334155',
          bold: '#64748b',
        },
        good: '#22c55e',
        'good-dark': '#22c55e',
        bad: '#ef4444',
        'bad-dark': '#ef4444',
        medalGold: '#a0740c',
        medalSilver: '#787f8c',
        medalBronze: '#b0713f',
      },
      borderRadius: {
        brutal: '8px',
        'brutal-lg': '12px',
        'brutal-xl': '16px',
      },
      boxShadow: {
        'brutal-1': '4px 4px 0px 0px #1e293b',
        'brutal-2': '8px 8px 0px 0px #1e293b',
        'brutal-1-dark': '4px 4px 0px 0px #64748b',
        'brutal-2-dark': '8px 8px 0px 0px #64748b',
      },
    },
  },
  plugins: [],
};
