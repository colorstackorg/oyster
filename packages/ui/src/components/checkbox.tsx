import React, { PropsWithChildren } from 'react';
import { Check as CheckIcon } from 'react-feather';
import { match } from 'ts-pattern';

import { ACCENT_COLORS, AccentColor } from '../utils/constants';
import { cx } from '../utils/cx';

type CheckboxProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  | 'defaultChecked'
  | 'id'
  | 'label'
  | 'name'
  | 'onChange'
  | 'readOnly'
  | 'required'
  | 'value'
> & {
  color?: AccentColor | 'gold-100';
};

export const Checkbox = ({
  color,
  label,
  id,
  readOnly,
  ...rest
}: CheckboxProps) => {
  return (
    <div className="flex items-center">
      <input
        className={cx(
          'absolute inline-block h-4 w-4 cursor-pointer opacity-0',
          'peer'
        )}
        id={id}
        readOnly={readOnly}
        type="checkbox"
        {...rest}
      />

      <div
        className={cx(
          'flex h-4 w-4 items-center justify-center rounded-[0.25rem] border-2 border-gray-300',
          'peer-hover:border-primary',
          'peer-focus:border-primary',
          'peer-checked:border-primary peer-checked:bg-primary',
          'peer-checked:disabled:border-gray-500 peer-checked:disabled:bg-gray-500'
        )}
      >
        <CheckIcon className="h-4 w-4 text-white" />
      </div>

      <label
        className={cx(
          'ml-2 cursor-pointer text-sm',
          color && 'rounded-full px-2',

          match(color)
            .with('amber-100', () => 'bg-amber-100')
            .with('blue-100', () => 'bg-blue-100')
            .with('cyan-100', () => 'bg-cyan-100')
            .with('gold-100', () => 'bg-gold-100')
            .with('green-100', () => 'bg-green-100')
            .with('lime-100', () => 'bg-lime-100')
            .with('orange-100', () => 'bg-orange-100')
            .with('pink-100', () => 'bg-pink-100')
            .with('purple-100', () => 'bg-purple-100')
            .with('red-100', () => 'bg-red-100')
            .with(undefined, () => undefined)
            .exhaustive()
        )}
        htmlFor={id}
      >
        {label}
      </label>
    </div>
  );
};

Checkbox.Group = function CheckboxGroup({ children }: PropsWithChildren) {
  const childrenWithProps = React.Children.map(children, (child, i: number) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        color: ACCENT_COLORS[i % ACCENT_COLORS.length],
      } as any);
    }

    return null;
  });

  return (
    <div className="flex flex-col gap-3" role="listbox">
      {childrenWithProps}
    </div>
  );
};
