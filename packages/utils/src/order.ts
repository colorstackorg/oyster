/**
 * Returns the keys of the map in the order specified by the map.
 *
 * @param map - Map of keys to order, where the value is the order number.
 */
export function order<T extends string>(map: Record<T, number>): T[] {
  const result = Object.keys(map).sort((a, b) => {
    return map[a as T] - map[b as T];
  }) as T[];

  return result;
}
