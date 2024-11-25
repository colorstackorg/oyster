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
  defaultValue = '',
  placeholder = 'Select...',
  required,
  width,
  value,
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
      defaultValue={
        // We can't use both the `defaultValue` and `value` prop since React
        // has to either be controlled or uncontrolled. If the `value` prop
        // is set, we'll use that, otherwise we'll use the `defaultValue`.
        // Also, we set the `defaultValue` to an empty string b/c otherwise,
        // if the select is required then it will use the first option as the
        // default value.
        value !== undefined ? undefined : defaultValue
      }
      required={required}
      value={value}
      {...rest}
    >
      <option className="disabled:text-gray-500" disabled={required} value="">
        {placeholder}
      </option>

      {children}
    </select>
  );
}
