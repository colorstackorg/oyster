import jwt from 'jsonwebtoken';

import { ENV } from '@/shared/env';

/**
 * Returns the encoded Basic Authentication token.
 *
 * @param username - ID to encode with, typically a username.
 * @param password - Secret to encode with, typically a password.
 */
export function encodeBasicAuthenticationToken(
  username: string,
  password: string
): string {
  return Buffer.from(`${username}:${password}`).toString('base64');
}

// JWT

type SignTokenOptions = Partial<{
  expiresIn: string;
}>;

export function signToken<T extends object>(
  data: T,
  options: SignTokenOptions = {}
): string {
  return jwt.sign(data, ENV.JWT_SECRET, options);
}
