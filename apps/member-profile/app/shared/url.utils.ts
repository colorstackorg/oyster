import normalizeUrl from 'normalize-url';

export function formatUrl<T>(value: T) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  return normalizeUrl(value, {
    forceHttps: true,
    removeQueryParameters: [new RegExp('(.*?)')],
    removeTrailingSlash: true,
    stripHash: true,
  });
}
