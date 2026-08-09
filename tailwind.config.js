/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#f2f4f9',
          alt: '#fbfcfe',
          fill: '#e8ebf2',
        },
        'surface-dark': {
          DEFAULT: '#0d1117',
          alt: '#161b22',
          fill: '#21262d',
        },
        ink: {
          DEFAULT: '#1b1f27',
          muted: '#5d6471',
          faint: '#5f6673',
        },
        'ink-dark': {
          DEFAULT: '#f5f7fc',
          muted: '#9da8b8',
          faint: '#788496',
        },
        rule: 'rgba(17, 26, 45, 0.08)',
        'rule-dark': 'rgba(255, 255, 255, 0.1)',
        accent: {
          DEFAULT: '#0071e3',
          ink: '#ffffff',
          soft: '#e7f0fd',
          deep: '#0056b3',
        },
        'accent-dark': {
          DEFAULT: '#0a84ff',
          ink: '#ffffff',
          soft: '#162842',
          deep: '#3899ff',
        },
        good: '#0a5d2e',
        'good-dark': '#30d158',
        bad: '#c62828',
        'bad-dark': '#ff453a',
        medalGold: '#a0740c',
        medalSilver: '#787f8c',
        medalBronze: '#b0713f',
      },
      boxShadow: {
        soft: '0 2px 12px 0 rgba(17, 26, 45, 0.06)',
      },
    },
  },
  plugins: [],
};
