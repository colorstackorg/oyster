import { ExtractValue } from '@oyster/types';

export type Color =
  | 'amber-100'
  | 'black'
  | 'blue-50'
  | 'blue-100'
  | 'cyan-100'
  | 'error'
  | 'gold'
  | 'gold-100'
  | 'gold-500'
  | 'gray-50'
  | 'gray-100'
  | 'gray-200'
  | 'gray-300'
  | 'gray-500'
  | 'gray-700'
  | 'gray-900'
  | 'green-100'
  | 'lime-50'
  | 'lime-100'
  | 'orange-100'
  | 'pink-100'
  | 'primary'
  | 'purple-100'
  | 'red-50'
  | 'red-100'
  | 'teal'
  | 'slate'
  | 'success'
  | 'warning'
  | 'white';

type ColorVariableRecord = {
  [Key in Color]: `var(--color-${Key})`;
};

export const ColorVariable: ColorVariableRecord = {
  'amber-100': 'var(--color-amber-100)',
  black: 'var(--color-black)',
  'blue-50': 'var(--color-blue-50)',
  'blue-100': 'var(--color-blue-100)',
  'cyan-100': 'var(--color-cyan-100)',
  error: 'var(--color-error)',
  gold: 'var(--color-gold)',
  'gold-100': 'var(--color-gold-100)',
  'gold-500': 'var(--color-gold-500)',
  'gray-50': 'var(--color-gray-50)',
  'gray-100': 'var(--color-gray-100)',
  'gray-200': 'var(--color-gray-200)',
  'gray-300': 'var(--color-gray-300)',
  'gray-500': 'var(--color-gray-500)',
  'gray-700': 'var(--color-gray-700)',
  'gray-900': 'var(--color-gray-900)',
  'green-100': 'var(--color-green-100)',
  'lime-50': 'var(--color-lime-50)',
  'lime-100': 'var(--color-lime-100)',
  'orange-100': 'var(--color-orange-100)',
  'pink-100': 'var(--color-pink-100)',
  primary: 'var(--color-primary)',
  'purple-100': 'var(--color-purple-100)',
  'red-50': 'var(--color-red-50)',
  'red-100': 'var(--color-red-100)',
  slate: 'var(--color-slate)',
  success: 'var(--color-success)',
  teal: 'var(--color-teal)',
  warning: 'var(--color-warning)',
  white: 'var(--color-white)',
} as const;

export type ColorVariable = ExtractValue<typeof ColorVariable>;

export const ACCENT_COLORS: Color[] = [
  'red-100',
  'orange-100',
  'lime-100',
  'purple-100',
  'blue-100',
  'pink-100',
  'amber-100',
  'cyan-100',
  'green-100',
];
