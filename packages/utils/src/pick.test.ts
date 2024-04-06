import { describe, expect, test } from 'bun:test';

import { pick } from './pick';

describe(pick.name, () => {
  test('Should pick keys from the object.', () => {
    expect(pick({ a: 1, b: 2 }, { a: true })).toEqual({ a: 1 });
    expect(pick({ a: 1, b: 2 }, { b: true })).toEqual({ b: 2 });
  });
});
