// TODO: Move this to the `core` package.

import { customAlphabet } from 'nanoid';

/**
 * Returns the value of a cookie.
 *
 * If the cookie is not found, returns `null`.
 *
 * @param cookie - The cookie string.
 * @param name - The name of the cookie to find.
 */
export function getCookie(cookie: string, name: string) {
  if (!cookie) {
    return null;
  }

  const regex = new RegExp(`(^| )${name}=([^;]+)`);

  const match = cookie.match(regex);

  if (!match) {
    return null;
  }

  return match[2];
}

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

/**
 * Returns a 12-digit nano ID.
 *
 * Uses the alphabet `0123456789abcdefghijklmnopqrstuvwxyz`.
 *
 * Should be used to create unique identifiers for objects that we will store
 * in our database.
 */
export function id() {
  return nanoid();
}

/**
 * Immediately invokes the given function (IIFE) and returns its result.
 *
 * This is helpful when we want to execute some logic within a particular
 * context, but we don't want to create a new scope for that logic.
 *
 * @example
 * ```ts
 * const result = run(() => {
 *  return 1 + 1;
 * });
 *
 * console.log(result); // 2
 * ```
 *
 * @param fn - The function to invoke.
 */
export function run<T>(fn: () => T): T {
  return fn();
}

type NormalizeOptions = Partial<{
  forceHttps: boolean;
  removeHash: boolean;
  removeSearch: boolean;
  removeTrailingSlash: boolean;
  removeWww: boolean;
}>;

/**
 * Transforms a URL ensuring that URLs are consistent across the application.
 *
 * By default, this function will force HTTPS, remove the hash, remove the
 * search, and remove the trailing slash.
 *
 * @param input - The URL to normalize. Must be a valid URL object.
 * @param options - The options to use when normalizing the URL.
 */
export function normalizeUri<T extends string | null | undefined>(
  input: T,
  options: NormalizeOptions = {}
) {
  if (!input) {
    return input;
  }

  const defaultOptions: NormalizeOptions = {
    forceHttps: true,
    removeHash: true,
    removeSearch: true,
    removeTrailingSlash: true,
    removeWww: false,
  };

  options = {
    ...defaultOptions,
    ...options,
  };

  const uri = new URL(input);

  if (options.removeWww) {
    uri.hostname = uri.hostname.replace('www.', '');
  }

  if (options.forceHttps) {
    uri.protocol = 'https:';
  }

  if (options.removeHash) {
    uri.hash = '';
  }

  if (options.removeSearch) {
    uri.search = '';
  }

  if (options.removeTrailingSlash && uri.pathname.endsWith('/')) {
    uri.pathname = uri.pathname.slice(0, -1);
  }

  return uri.toString();
}

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

/**
 * Blocks the current thread for the specified number of milliseconds.
 *
 * @param ms - Number of milliseconds to sleep.
 *
 * @example
 * await sleep(1000); // Sleep for 1 second.
 * await sleep(5000); // Sleep for 5 seconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Splits an array into multiple smaller arrays of a specified maximum size.
 *
 * @param array - The array to be split.
 * @param size - The maximum size of each sub-array.
 * @returns An array of sub-arrays, each with a maximum length of `size`.
 *
 * @example
 * ```ts
 * splitArray([1, 2, 3, 4, 5], 2); // => [[1, 2], [3, 4], [5]]
 * splitArray([1, 2, 3, 4, 5], 3); // => [[1, 2, 3], [4, 5]]
 * splitArray([1, 2, 3, 4, 5], 5); // => [[1, 2, 3, 4, 5]]
 * splitArray([1, 2, 3, 4, 5], 10); // => [[1, 2, 3, 4, 5]]
 * ```
 */
export function splitArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

/**
 * Returns the string with all special characters escaped.
 *
 * This is useful for escaping strings that will be used in a `RegExp`.
 *
 * @example
 * ```ts
 * toEscapedString('foo.bar') // => 'foo\\.bar'
 * toEscapedString('foo[bar]') // => 'foo\\[bar\\]'
 * toEscapedString('foo(bar)') // => 'foo\\(bar\\)'
 * toEscapedString('foo{bar}') // => 'foo\\{bar\\}'
 * toEscapedString('foo?bar') // => 'foo\\?bar'
 * toEscapedString('foo+bar') // => 'foo\\+bar'
 * toEscapedString('foo*bar') // => 'foo\\*bar'
 * toEscapedString('foo^bar') // => 'foo\\^bar'
 * toEscapedString('foo$bar') // => 'foo\\$bar'
 * toEscapedString('foo|bar') // => 'foo\\|bar'
 * ```
 */
export function toEscapedString(input: string): string {
  return input.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
}

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
