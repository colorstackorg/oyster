import React from 'react';

import { cx } from '../utils/cx';
import { getInputCn } from './input';

export type DatePickerProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  'defaultValue' | 'id' | 'name' | 'onBlur' | 'placeholder' | 'required'
> & {
  type: 'date' | 'datetime-local' | 'month';
};

export function DatePicker({ type, ...rest }: DatePickerProps) {
  return (
    <input
      className={cx(
        getInputCn(),
        'block',

        // iOS has weird default styling for date inputs - we'll undo those.
        'appearance-none bg-inherit [&::-webkit-date-and-time-value]:text-left'
      )}
      type={type}
      {...rest}
    />
  );
}
