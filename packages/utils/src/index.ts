// TODO: Move all utils into one file (except for ones that require a specific
// NPM package).

// TODO: Move this to the `core` package.

export { getCookie } from './get-cookie';
export { id } from './id';
export { iife } from './iife';
export { order } from './order';
export { pick } from './pick';
export { sleep } from './sleep';
export { toEscapedString } from './to-escaped-string';
export { toTitleCase } from './to-title-case';

type NormalizeOptions = Partial<{
  forceHttps: boolean;
  removeHash: boolean;
  removeSearch: boolean;
  removeTrailingSlash: boolean;
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
  };

  options = {
    ...defaultOptions,
    ...options,
  };

  const uri = new URL(input);

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
