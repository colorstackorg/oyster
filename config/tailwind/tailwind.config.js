import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export const tailwindConfig = {
  blocklist: ['overflow-scroll'],
  content: [
    '../apps/admin-dashboard/app/**/*.{ts,tsx}',
    '../apps/member-profile/app/**/*.{ts,tsx}',
    '../packages/ui/src/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        error: colors.red[600],
        gold: '#fdb532',
        'gold-100': '#fff7ea',
        primary: '#348e87',
        success: colors.green[600],
        warning: colors.yellow[400],
      },
      keyframes: {
        'loader-shimmer': {
          '0%, 100%': { opacity: '0.1' },
          '50%': { opacity: '0.8' },
        },
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
        'toast-animation': {
          '0%': { transform: 'translateX(-150%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        'toast-shader-animation': {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
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
