import jwt, { type SignOptions } from 'jsonwebtoken';

// Environment Variables

const JWT_SECRET = process.env.JWT_SECRET as string;

// Core

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

export function signToken<T extends object>(
  data: T,
  options?: SignOptions
): string {
  return jwt.sign(data, JWT_SECRET, options);
}
