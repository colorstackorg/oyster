import React, { type HTMLInputTypeAttribute } from 'react';

import { cx } from '../utils/cx';

export type InputProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  | 'autoComplete'
  | 'autoFocus'
  | 'className'
  | 'defaultValue'
  | 'form'
  | 'id'
  | 'max'
  | 'min'
  | 'name'
  | 'onBlur'
  | 'onChange'
  | 'onFocus'
  | 'placeholder'
  | 'readOnly'
  | 'required'
  | 'type'
  | 'value'
> & {
  type?: Extract<HTMLInputTypeAttribute, 'email' | 'number' | 'text'>;
};

export const Input = React.forwardRef(
  (
    { className, type = 'text', ...rest }: InputProps,
    ref: React.ForwardedRef<HTMLInputElement>
  ) => {
    return (
      <input
        className={cx(getInputCn(), className)}
        ref={ref}
        type={type}
        {...rest}
      />
    );
  }
);

export function getInputCn() {
  return cx(
    'w-full rounded-lg border border-gray-300 p-2',
    'focus:border-primary'
  );
}
