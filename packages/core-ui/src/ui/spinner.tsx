import { match } from 'ts-pattern';

import { Color } from '../utils/constants';
import { cx } from '../utils/cx';

type SpinnerProps = {
  color?: Extract<Color, 'error' | 'primary' | 'success'>;
};

export function Spinner({ color = 'primary' }: SpinnerProps) {
  return (
    <span
      aria-busy="true"
      aria-label="Spinner"
      className={cx(
        'block h-4 w-4 animate-spin rounded-full border-[2.5px] border-gray-300',

        match(color)
          .with('error', () => 'border-l-red-600 border-t-red-600')
          .with('primary', () => 'border-l-primary border-t-primary')
          .with('success', () => 'border-l-green-600 border-t-green-600')
          .exhaustive()
      )}
      role="status"
    />
  );
}
