/**
 * Immediately invokes the given function and returns its result.
 *
 * This is helpful when we want to execute some logic within a particular
 * context, but we don't want to create a new scope for that logic.
 *
 * @example
 * ```ts
 * const result = iife(() => {
 *  return 1 + 1;
 * });
 *
 * console.log(result); // 2
 * ```
 *
 * @param fn - The function to invoke.
 */
export function iife<T>(fn: () => T): T {
  return fn();
}
