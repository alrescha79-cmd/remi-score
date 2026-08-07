/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f4f5f7',
        },
        'surface-dark': {
          DEFAULT: '#0d0e11',
          alt: '#17181d',
        },
        ink: {
          DEFAULT: '#16181d',
          muted: '#6b7280',
        },
        'ink-dark': {
          DEFAULT: '#f2f4f7',
          muted: '#9aa3af',
        },
        accent: {
          DEFAULT: '#6d5dfc',
          soft: '#edeaff',
        },
        'accent-dark': {
          soft: '#211d3d',
        },
        good: '#16a34a',
        bad: '#dc2626',
      },
    },
  },
  plugins: [],
};
