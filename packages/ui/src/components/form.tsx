import React, { type PropsWithChildren } from 'react';
import { type z } from 'zod';

import { Input, type InputProps } from './input';
import { Text } from './text';
import { cx } from '../utils/cx';
import { zodErrorMap } from '../utils/zod';

export function ErrorMessage({ children }: PropsWithChildren) {
  return children ? (
    <Text className="whitespace-pre-wrap" color="error">
      {children}
    </Text>
  ) : null;
}

type FormFieldProps = {
  children: React.ReactNode;
  description?: string | React.ReactElement;
  error?: string | React.ReactElement | null;
  label?: string;
  labelFor?: string;
  required?: boolean;
};

export function Field({
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
}

// Common Fields

type InputFieldProps = FieldProps<string> &
  Pick<FormFieldProps, 'description' | 'label' | 'required'> &
  Pick<InputProps, 'disabled' | 'placeholder'>;

/**
 * @deprecated Instead, just compose the `Field` and `Input` together.
 */
export function InputField({
  defaultValue,
  description,
  disabled,
  error,
  label,
  name,
  placeholder,
  required,
}: InputFieldProps) {
  return (
    <Field
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
      />
    </Field>
  );
}

// Validation Utilities

type GetErrorsInput<T> =
  | {
      error?: string | undefined;
      errors?: T | undefined;
      [key: string]: unknown;
    }
  | undefined;

export function getErrors<T>(input: GetErrorsInput<T>) {
  return {
    ...input,
    error: input?.error || undefined,
    errors: input?.errors || ({} as T),
  };
}

type ExtractUnionKeys<T> =
  T extends z.ZodDiscriminatedUnion<string, infer Variants>
    ? Variants extends readonly z.AnyZodObject[]
      ? keyof z.infer<Variants[number]>
      : never
    : keyof T;

type ValidateResult<Data> =
  | {
      data: Data;
      ok: true;
    }
  | {
      errors: Partial<Record<ExtractUnionKeys<Data>, string>>;
      ok: false;
    };

type ValidateFormInput =
  | Request
  | FormData
  | Record<string, FormDataEntryValue | FormDataEntryValue[] | null>;

/**
 * Validates a form against a Zod schema.
 *
 * The input is flexible and can either be a `Request`, `FormData`, or a plain
 * object. Ultimately, the input is converted to a plain object before being
 * validated.
 *
 * The `ok` property in the result indicates whether the form is valid or not.
 */
export async function validateForm<
  T extends z.AnyZodObject | z.ZodDiscriminatedUnion<string, z.AnyZodObject[]>,
>(input: ValidateFormInput, schema: T): Promise<ValidateResult<z.infer<T>>> {
  if (input instanceof Request) {
    input = await input.formData();
  }

  const data = input instanceof FormData ? Object.fromEntries(input) : input;

  const result = schema.safeParse(data, {
    errorMap: zodErrorMap,
  });

  if (result.success) {
    return {
      data: result.data,
      ok: true,
    };
  }

  const errors: Extract<ValidateResult<T>, { ok: false }>['errors'] = {};

  const { fieldErrors } = result.error.formErrors;

  Object.entries(fieldErrors).forEach(([key, fieldErrors]) => {
    errors[key as ExtractUnionKeys<T>] = fieldErrors?.[0];
  });

  return {
    errors,
    ok: false,
  };
}

// Type Utilities

export type FieldProps<T> = {
  defaultValue?: T;
  error?: string | React.ReactElement;
  name: string;
};
