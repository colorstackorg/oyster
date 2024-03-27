import { customAlphabet } from 'nanoid';

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
