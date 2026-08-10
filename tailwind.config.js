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
          DEFAULT: '#0e1217',
          alt: '#181f2a',
          fill: '#242c3d',
        },
        ink: {
          DEFAULT: '#1b1f27',
          muted: '#5d6471',
          faint: '#5f6673',
        },
        'ink-dark': {
          DEFAULT: '#ffffff',
          muted: '#b0bccd',
          faint: '#8a99ad',
        },
        rule: 'rgba(17, 26, 45, 0.08)',
        'rule-dark': 'rgba(255, 255, 255, 0.15)',
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
