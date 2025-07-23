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

// Dollar Input

type DollarInputProps = Pick<InputProps, 'id' | 'name' | 'required'> & {
  defaultValue?: string; // Limit the default value to a string.
};

const dollarFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
});

export function DollarInput({
  defaultValue = '',
  name,
  ...rest
}: DollarInputProps) {
  const [displayValue, setDisplayValue] = useState(
    getDisplayValue(defaultValue)
  );

  function getDisplayValue(input: string): string {
    return dollarFormatter.format(getValue(input));
  }

  function getValue(input: string): number {
    return Number(input.replace(/[^0-9.]/g, '')) || 0;
  }

  const value = getValue(displayValue);

  return (
    <>
      <input
        autoComplete="off"
        className={getInputCn()}
        inputMode="decimal"
        onBlur={(e) => {
          setDisplayValue(getDisplayValue(e.target.value));
        }}
        onChange={(e) => {
          // We'll allow commas and periods in the input, but we'll strip the
          // commas on blur.
          setDisplayValue('$' + e.target.value.replace(/[^0-9.,]/g, ''));
        }}
        placeholder="$0.00"
        type="text"
        value={displayValue}
        {...rest}
      />

      <input name={name} type="hidden" value={value} />
    </>
  );
}
// Phone Number Input

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
        placeholder="(555) 123-4567"
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

// Helpers

type InputCnOptions = {
  readOnly?: boolean;
};

export function getInputCn(options: InputCnOptions = { readOnly: true }) {
  return cx(
    'w-full rounded-lg border border-gray-300 p-2',
    'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
    options.readOnly &&
      'read-only:cursor-not-allowed read-only:bg-gray-50 read-only:text-gray-500',
    'focus:border-primary'
  );
}
