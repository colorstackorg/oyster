const WORDS_TO_IGNORE = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'if',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
]);

/**
 * Returns the capitalized version of the given input string.
 *
 * - If the input consists of multiple words, it will capitalize each word.
 * - If the input is null/empty string, it just returns the input.
 *
 * @param input - Input to convert to title case.
 *
 * @example
 * // Returns 'active'.
 * toTitleCase('Active');
 *
 * @example
 * // Returns 'reply_to_thread'.
 * toTitleCase('Reply to Thread');
 */
export function toTitleCase(input: string): string {
  if (!input) {
    return input;
  }

  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => {
      return word.toLowerCase();
    })
    .map((word, i) => {
      const shouldCapitalize = i === 0 || !WORDS_TO_IGNORE.has(word);

      return shouldCapitalize
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word;
    })
    .join(' ');
}
