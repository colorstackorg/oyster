import { describe, expect, test } from 'vitest';

import { getCookie } from './get-cookie';

describe(getCookie.name, () => {
  test('If the cookie string is empty...', () => {
    const result = getCookie('', '');
    expect(result).toBeNull();
  });

  test('If the cookie string does not contain the name of the cookie...', () => {
    const result = getCookie('name=Rami;', 'email');
    expect(result).toBeNull();
  });

  test('If the cookie string contains the name of the cookie...', () => {
    const result = getCookie('name=Rami;', 'name');
    expect(result).toEqual('Rami');
  });

  test('If the cookie string contains the name of the cookie and other cookies...', () => {
    const result = getCookie('name=Rami; email=rami@colorstack.org;', 'name');
    expect(result).toEqual('Rami');
  });
});
