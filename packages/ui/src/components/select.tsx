import React from 'react';

import { getInputCn } from './input';
import { cx } from '../utils/cx';

export type SelectProps = Pick<
  React.HTMLProps<HTMLSelectElement>,
  | 'children'
  | 'defaultValue'
  | 'id'
  | 'name'
  | 'onBlur'
  | 'onChange'
  | 'placeholder'
  | 'readOnly'
  | 'required'
  | 'value'
> & {
  width?: 'fit';
};

export function Select({
  children,
  placeholder = 'Select...',
  required,
  width,
  ...rest
}: SelectProps) {
  return (
    <select
      className={cx(
        getInputCn(),

        // If the width is set to 'fit', we'll add some padding to the right
        // to allow room for the arrow icon to fit in the "background-image".
        width === 'fit' && 'w-fit pr-8',

        'appearance-none bg-[length:1rem] bg-[position:center_right_0.5rem] bg-no-repeat',
        'focus-visible:outline-none',
        'required:invalid:text-gray-400',

        // iOS has weird default styling for select elements - we'll undo those.
        'bg-inherit'
      )}
      required={required}
      {...rest}
    >
      <option className="disabled:text-gray-500" disabled={required} value="">
        {placeholder}
      </option>

      {children}
    </select>
  );
}
