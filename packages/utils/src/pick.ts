/**
 * Picks the keys from the object. Acts similar to the Typescript `Pick` type.
 *
 * @param input - The object to pick the keys from.
 * @param picker - The object that specifies which keys to pick.
 *
 * @example
 * ```ts
 * // { a: 1, c: 3 }
 * pick({ a: 1, b: 2, c: 3 }, { a: true, c: true });
 * ```
 */
export function pick<
  Input,
  Picker extends {
    [k in keyof Input]?: true;
  },
>(
  input: Input,
  picker: Picker
): Pick<Input, Extract<keyof Input, keyof Picker>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};

  const keys = Object.keys(picker) as (keyof Input)[];

  keys.forEach((key) => {
    result[key] = input[key];
  });

  return result;
}
