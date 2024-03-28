/** @type {import('tailwindcss').Config} */
export const tailwindConfig = {
  content: [
    '../apps/admin-dashboard/app/**/*.{ts,tsx}',
    '../apps/member-profile/app/**/*.{ts,tsx}',
    '../packages/ui/src/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
      },
      keyframes: {
        'modal-animation': {
          '0%': { opacity: 0, transform: 'scale(0)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'modal-animation-mobile': {
          '0%': { bottom: '-100vh' },
          '100%': { bottom: '0vh' },
        },
        'modal-shader-animation': {
          '0%': { opacity: 0 },
          '100%': { opacity: 0.75 },
        },
        'slide-from-left': {
          '0%': { left: '-100%' },
          '100%': { left: '0%' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries')],
};

export default tailwindConfig;
