import { twMerge } from 'tailwind-merge';

type ClassName = string | boolean | null | undefined;

/**
 * Returns the class names combined into one string.
 *
 * @param classNames - Class names to combine.
 *
 * @example
 * // Returns '1'.
 * cx('1');
 *
 * @example
 * // Returns '1 2'.
 * cx('1', '2');
 */
export function cx(...classNames: ClassName[]): string {
  return twMerge(classNames.filter(Boolean).join(' '));
}
