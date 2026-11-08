/**
 * Normalizes user input into a LinkedIn company slug.
 *
 * Accepts either a full LinkedIn company URL or a bare slug, so forms can be
 * lenient about what they accept.
 *
 * This lives apart from the use cases that fetch from LinkedIn because it is
 * also needed by `employment.types.ts`, which is bundled for the browser. Any
 * import of a use case from there pulls Redis and the Sentry Node SDK into the
 * client build.
 *
 * @example parseLinkedInCompanySlug('https://www.linkedin.com/company/google') // 'google'
 * @example parseLinkedInCompanySlug('@google') // 'google'
 */
export function parseLinkedInCompanySlug(input: string) {
  const trimmed = input.trim();

  const match = trimmed.match(/linkedin\.com\/company\/([^/?#]+)/i);

  if (match?.[1]) {
    return match[1];
  }

  return trimmed.replace(/^@/, '');
}

/**
 * Returns `true` if the input points to a specific LinkedIn company (ie: a
 * numeric LinkedIn ID or a LinkedIn company URL), and `false` if it is a
 * free-text company name that we need to search for.
 *
 * @example isLinkedInCompanyReference('1441') // true
 * @example isLinkedInCompanyReference('https://www.linkedin.com/company/google') // true
 * @example isLinkedInCompanyReference('Capital One') // false
 */
export function isLinkedInCompanyReference(input: string) {
  const trimmed = input.trim();

  return /^\d+$/.test(trimmed) || /linkedin\.com\/company\//i.test(trimmed);
}
