import React from 'react';

import { getInputCn } from './input';
import { cx } from '../utils/cx';

type DatePickerProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  | 'defaultValue'
  | 'id'
  | 'max'
  | 'min'
  | 'name'
  | 'onBlur'
  | 'placeholder'
  | 'required'
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
