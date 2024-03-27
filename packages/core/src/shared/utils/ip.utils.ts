import { isIP } from 'is-ip';

const HEADER_NAMES = Object.freeze([
  'X-Client-IP',
  'X-Forwarded-For',
  'HTTP-X-Forwarded-For',
  'Fly-Client-IP',
  'CF-Connecting-IP',
  'Fastly-Client-Ip',
  'True-Client-Ip',
  'X-Real-IP',
  'X-Cluster-Client-IP',
  'X-Forwarded',
  'Forwarded-For',
  'Forwarded',
  'DO-Connecting-IP',
  'oxygen-buyer-ip',
] as const);

/**
 * Returns the IP address of the client sending the request.
 *
 * Copied (and slightly modified) from `remix-utils` to avoid pulling in entire
 * package.
 *
 * @see https://github.com/sergiodxa/remix-utils/blob/v7.1.0/src/server/get-client-ip-address.ts
 */
export function getIpAddress(request: Request) {
  const possibleAddresses = HEADER_NAMES.flatMap((name) => {
    let value = request.headers.get(name);

    if (name === 'Forwarded') {
      return parseForwardedHeader(value);
    }

    if (!value?.includes(',')) {
      return value;
    }

    return value.split(',').map((ip) => {
      return ip.trim();
    });
  });

  const ip = possibleAddresses.find((address) => {
    return address ? isIP(address) : false;
  });

  return ip || null;
}

function parseForwardedHeader(value: string | null) {
  if (!value) {
    return null;
  }

  for (let part of value.split(';')) {
    if (part.startsWith('for=')) {
      return part.slice(4);
    }

    continue;
  }

  return null;
}
