/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{ts,tsx}',
    '../../packages/core-ui/src/**/*.tsx',
    '../../packages/feature-ui/src/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
      },
      keyframes: {
        'slide-from-left': {
          '0%': { left: '-100%' },
          '100%': { left: '0%' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries')],
};
