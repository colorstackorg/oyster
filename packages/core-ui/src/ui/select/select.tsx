import React from 'react';

import { cx } from '../../utils/cx';
import { getInputCn } from '../input';

import styles from './select.module.scss';

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
>;

export function Select({
  children,
  defaultValue = '',
  placeholder = 'Select...',
  required,
  ...rest
}: SelectProps) {
  return (
    <select
      className={cx(
        getInputCn(),
        styles.select,
        'focus-visible:outline-none',
        'required:invalid:text-gray-400',

        // iOS has weird default styling for select elements - we'll undo those.
        'bg-inherit'
      )}
      defaultValue={defaultValue}
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
