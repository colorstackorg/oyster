import React, { type PropsWithChildren } from 'react';
import { match } from 'ts-pattern';

import { ACCENT_COLORS, type AccentColor } from '../utils/constants';
import { cx } from '../utils/cx';

type RadioProps = Pick<
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
  color?: AccentColor | 'primary';
};

export const Radio = ({
  color = 'primary',
  label,
  id,
  readOnly,
  ...rest
}: RadioProps) => {
  return (
    <div className="flex items-center">
      <input
        className={cx(
          'absolute inline-block h-4 w-4 cursor-pointer opacity-0',
          'peer'
        )}
        id={id}
        onClick={(e) => e.stopPropagation()}
        readOnly={readOnly}
        type="radio"
        {...rest}
      />

      <div
        className={cx(
          'flex h-4 w-4 items-center justify-center rounded-full border-2 border-gray-300 bg-inherit',
          'peer-hover:border-primary peer-focus:border-primary',
          'peer-checked:border-primary peer-checked:bg-white',
          'peer-checked:*:bg-primary'
        )}
      >
        <span className="h-[60%] w-[60%] rounded-full" />
      </div>

      <label
        className={cx(
          'ml-2 cursor-pointer rounded-full px-2 text-sm',

          match(color)
            .with('amber-100', () => 'bg-amber-100')
            .with('blue-100', () => 'bg-blue-100')
            .with('cyan-100', () => 'bg-cyan-100')
            .with('green-100', () => 'bg-green-100')
            .with('lime-100', () => 'bg-lime-100')
            .with('orange-100', () => 'bg-orange-100')
            .with('pink-100', () => 'bg-pink-100')
            .with('purple-100', () => 'bg-purple-100')
            .with('red-100', () => 'bg-red-100')
            .with('primary', () => 'bg-primary')
            .exhaustive()
        )}
        htmlFor={id}
      >
        {label}
      </label>
    </div>
  );
};

type RadioGroupProps = PropsWithChildren<{
  defaultValue?: string;
}>;

Radio.Group = function RadioGroup({ children, defaultValue }: RadioGroupProps) {
  const childrenWithProps = React.Children.map(children, (child, i) => {
    if (React.isValidElement(child)) {
      const props: Partial<RadioProps> = {
        ...child.props,
        color: child.props.color || ACCENT_COLORS[i % ACCENT_COLORS.length],
        defaultChecked:
          child.props.value === defaultValue || child.props.defaultChecked,
      };

      return React.cloneElement(child, props);
    }

    return null;
  });

  return (
    <div className="flex flex-col gap-3" role="listbox">
      {childrenWithProps}
    </div>
  );
};
