/**
 * Picks the keys from the object. Acts similar to the Typescript `Pick` type.
 *
 * @param object - The object to pick the keys from.
 * @param picker - The object that specifies which keys to pick.
 *
 * @example
 * ```ts
 * // { a: 1, c: 3 }
 * pick({ a: 1, b: 2, c: 3 }, { a: true, c: true });
 * ```
 */
export function pick<
  Object,
  Picker extends {
    [k in keyof Object]?: true;
  }
>(
  object: Object,
  picker: Picker
): Pick<Object, Extract<keyof Object, keyof Picker>> {
  const result: any = {};

  const keys = Object.keys(picker) as (keyof Object)[];

  keys.forEach((key) => {
    result[key] = object[key];
  });

  return result;
}
