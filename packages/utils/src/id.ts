import { customAlphabet } from 'nanoid';

const DEFAULT_SIZE = 12;

const nanoid = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  DEFAULT_SIZE
);

/**
 * Returns a 12-digit nano ID.
 *
 * Uses the alphabet `0123456789abcdefghijklmnopqrstuvwxyz`.
 *
 * Should be used to create unique identifiers for objects that we will store
 * in our database.
 */
export function id(size: number = DEFAULT_SIZE) {
  return nanoid(size);
}
