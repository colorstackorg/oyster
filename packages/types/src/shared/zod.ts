import { z } from 'zod';

export const BooleanInput = z.preprocess((value) => {
  return typeof value === 'boolean' ? value : value === '1';
}, z.boolean());

export const ISO8601Date = z.coerce.date().transform((value) => {
  return value.toISOString().split('T')[0];
});

/**
 * Use for all nullish fields that are free text.
 *
 * This ensures that we never store empty strings in the database, only null.
 * This also helps with "unsetting" fields by setting them to null.
 */
export const NullishString = z.preprocess(
  (value) => value || null,
  z.string().trim().min(1).nullish()
);

export const Timezone = z.preprocess((value) => {
  return value === 'null' || value === 'undefined' ? null : value;
}, z.string().trim().min(1).catch('America/New_York'));

// Functions

/**
 * Preprocesses the value passed into the schema so that a string value is
 * transformed to an array of strings.
 *
 * This is helpful for checkbox fields that are read as comma-separated strings
 * when processing a form submission (ie: form.getAll('field')).
 *
 * @param schema - Zod schema to use for _each item_ in the array.
 */
export function multiSelectField<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    return typeof value === 'string' ? value.split(',') : value;
  }, z.array(schema));
}

/**
 * Preprocesses the value passed into the schema so that a falsy value is
 * transformed to `null`.
 *
 * This is particularly helpful for string values that are nullable, but require
 * at least 1 character.
 */
export function nullableField<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => value || null, schema);
}
