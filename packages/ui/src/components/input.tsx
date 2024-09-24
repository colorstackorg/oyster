import React, { type HTMLInputTypeAttribute, useState } from 'react';

import { cx } from '../utils/cx';

export type InputProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  | 'autoComplete'
  | 'autoFocus'
  | 'className'
  | 'defaultValue'
  | 'disabled'
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

type PhoneNumberInputProps = Pick<InputProps, 'id' | 'name' | 'required'> & {
  defaultValue?: string; // Limit the default value to a string.
};

export function PhoneNumberInput({
  defaultValue,
  name,
  ...rest
}: PhoneNumberInputProps) {
  const [value, setValue] = useState(defaultValue || '');

  const formattedValue = formatPhoneNumber(value);
  const rawValue = formattedValue.replace(/\D/g, '');

  return (
    <>
      <input
        className={getInputCn()}
        onChange={(e) => setValue(e.target.value)}
        pattern="\(\d{3}\) \d{3}-\d{4}"
        placeholder="(123) 456-7890"
        type="tel"
        value={formattedValue}
        {...rest}
      />

      <input name={name} type="hidden" value={rawValue} />
    </>
  );
}

/**
 * Formats a phone number to the format: (xxx) xxx-xxxx.
 *
 * @param number - The phone number to format.
 * @returns The formatted phone number.
 *
 * @example
 * formatPhoneNumber("") => ""
 * formatPhoneNumber("1") => "(1"
 * formatPhoneNumber("12") => "(12"
 * formatPhoneNumber("123") => "(123"
 * formatPhoneNumber("1234") => "(123) 4"
 * formatPhoneNumber("12345") => "(123) 45"
 * formatPhoneNumber("123456") => "(123) 456"
 * formatPhoneNumber("1234567") => "(123) 456-7"
 * formatPhoneNumber("12345678") => "(123) 456-78"
 * formatPhoneNumber("123456789") => "(123) 456-789"
 * formatPhoneNumber("1234567890") => "(123) 456-7890"
 * formatPhoneNumber("1234567890123") => "(123) 456-7890"
 */
function formatPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  }

  if (digits.length <= 3) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function getInputCn() {
  return cx(
    'w-full rounded-lg border border-gray-300 p-2',
    'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
    'focus:border-primary'
  );
}
