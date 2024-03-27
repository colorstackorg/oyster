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
