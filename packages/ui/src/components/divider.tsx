import { match } from 'ts-pattern';

import { cx } from '../utils/cx';

type DividerProps = {
  my?: '2' | '4';
};

export function Divider({ my }: DividerProps) {
  return (
    <hr
      className={cx(
        'm-0 w-full border border-gray-100',

        match(my)
          .with('2', () => 'my-2')
          .with('4', () => 'my-4')
          .with(undefined, () => 'my-0')
          .exhaustive()
      )}
    />
  );
}
