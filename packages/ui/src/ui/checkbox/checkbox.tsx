import React, { PropsWithChildren } from 'react';
import { Check as CheckIcon } from 'react-feather';

import { ACCENT_COLORS, Color, ColorVariable } from '../../utils/constants';
import { cx } from '../../utils/cx';
import styles from './checkbox.module.scss';

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
  color?: Color;
};

export const Checkbox = ({
  color,
  label,
  id,
  readOnly,
  ...rest
}: CheckboxProps) => {
  const labelStyle = {
    '--color': ColorVariable[color as Color],
  } as React.CSSProperties;

  return (
    <div className="flex items-center">
      <input
        className={cx(
          styles.checkboxInput,
          'absolute inline-block h-4 w-4 cursor-pointer opacity-0'
        )}
        id={id}
        readOnly={readOnly}
        type="checkbox"
        {...rest}
      />

      <div
        className={cx(
          styles.checkboxBackground,
          'flex h-4 w-4 items-center justify-center rounded-[0.25rem] border-2 border-gray-300'
        )}
      >
        <CheckIcon className="h-4 w-4 text-white" />
      </div>

      <label
        className={cx(
          'ml-2 cursor-pointer text-sm',
          color && 'rounded-full bg-[var(--color)] px-2'
        )}
        htmlFor={id}
        style={labelStyle}
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
