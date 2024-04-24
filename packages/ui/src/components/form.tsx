import React, { type PropsWithChildren } from 'react';
import { type z } from 'zod';

import { Input, type InputProps } from './input';
import { Text } from './text';
import { cx } from '../utils/cx';
import { zodErrorMap } from '../utils/zod';

export const Form = () => {};

Form.ErrorMessage = function FormErrorMessage({ children }: PropsWithChildren) {
  return children ? <Text color="error">{children}</Text> : null;
};

type FormFieldProps = {
  children: React.ReactNode;
  description?: string | React.ReactElement;
  error?: string | null;
  label?: string;
  labelFor?: string;
  required?: boolean;
};

Form.Field = function FormField({
  children,
  description,
  error,
  label,
  labelFor,
  required,
}: FormFieldProps) {
  return (
    <div>
      {label && (
        <label
          className={cx(
            'mb-2 inline-block',
            required && "after:ml-1 after:text-red-600 after:content-['*']"
          )}
          htmlFor={labelFor}
        >
          {label}
        </label>
      )}

      {description && typeof description === 'string' && (
        <p className="mb-4 text-sm text-gray-500">{description}</p>
      )}

      {description &&
        typeof description !== 'string' &&
        React.cloneElement(description, {
          className: cx(
            'mb-4 text-sm text-gray-500',
            description.props.className
          ),
        })}

      {children}

      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
};

// Validation Utilities

type GetActionErrorsInput<T> =
  | {
      error: string | undefined;
      errors: T | undefined;
    }
  | undefined;

type ActionErrors<T> = {
  error: string;
  errors: T;
};

export function getActionErrors<T>(
  input: GetActionErrorsInput<T>
): ActionErrors<T> {
  return {
    error: input?.error || '',
    errors: input?.errors || ({} as T),
  };
}

type ValidateResult<Data> = {
  data: Data | undefined;
  errors: Record<keyof Data, string>;
};

export function validateForm<T extends z.AnyZodObject>(
  schema: T,
  data: unknown
): ValidateResult<z.infer<T>> {
  const result = schema.safeParse(data, {
    errorMap: zodErrorMap,
  });

  const errors = {} as ValidateResult<T>['errors'];

  const keys = schema.keyof().enum;

  type Key = keyof z.infer<T>;

  Object.keys(keys).forEach((_key) => {
    const key = _key as Key;

    errors[key] = '';
  });

  if (result.success) {
    return {
      data: result.data,
      errors,
    };
  }

  const { fieldErrors } = result.error.formErrors;

  Object.entries(fieldErrors).forEach(([_key, fieldErrors]) => {
    const key = _key as Key;

    if (fieldErrors) {
      errors[key] = fieldErrors[0] || '';
    }
  });

  return {
    data: undefined,
    errors,
  };
}

// Type Utilities

export type FieldProps<T> = {
  defaultValue?: T;
  error?: string;
  name: string;
};

// Common Fields

type InputFieldProps = FieldProps<string> &
  Pick<FormFieldProps, 'description' | 'label' | 'required'> &
  Pick<InputProps, 'disabled' | 'placeholder' | 'readOnly'>;

export function InputField({
  defaultValue,
  description,
  disabled,
  error,
  label,
  name,
  placeholder,
  required,
  readOnly,
}: InputFieldProps) {
  return (
    <Form.Field
      description={description}
      error={error}
      label={label}
      labelFor={name}
      required={required}
    >
      <Input
        defaultValue={defaultValue}
        disabled={disabled}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
      />
    </Form.Field>
  );
}
