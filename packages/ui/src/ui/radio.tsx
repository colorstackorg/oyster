import React, { PropsWithChildren } from 'react';

import { ACCENT_COLORS, Color, ColorVariable } from '../utils/constants';
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
  color?: Color;
};

export const Radio = ({
  color = 'primary',
  label,
  id,
  readOnly,
  ...rest
}: RadioProps) => {
  const style = {
    '--color': ColorVariable[color],
  } as React.CSSProperties;

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
          'peer-checked:bg-white peer-checked:border-primary',
          'peer-checked:*:bg-primary'
        )}
      >
        <span className="h-[60%] w-[60%] rounded-full" />
      </div>

      <label
        className="ml-2 cursor-pointer rounded-full bg-[var(--color)] px-2 text-sm"
        htmlFor={id}
        style={style}
      >
        {label}
      </label>
    </div>
  );
};

Radio.Group = function RadioGroup({ children }: PropsWithChildren) {
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
