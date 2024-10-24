// This was copied from the UI package to avoid an unnecessary dependency on
// the UI package when only the color utilities are needed.
export type AccentColor =
  | 'amber-100'
  | 'blue-100'
  | 'cyan-100'
  | 'green-100'
  | 'lime-100'
  | 'orange-100'
  | 'pink-100'
  | 'purple-100'
  | 'red-100';

const ACCENT_COLORS: AccentColor[] = [
  'amber-100',
  'blue-100',
  'cyan-100',
  'green-100',
  'lime-100',
  'orange-100',
  'pink-100',
  'purple-100',
  'red-100',
];

export function getRandomAccentColor(): AccentColor {
  return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];
}
