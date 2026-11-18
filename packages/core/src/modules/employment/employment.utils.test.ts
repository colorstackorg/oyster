import { describe, expect, test } from 'bun:test';

import {
  isLinkedInCompanyReference,
  parseLinkedInCompanySlug,
} from './employment.utils';

describe(isLinkedInCompanyReference.name, () => {
  test('Should return true for a numeric LinkedIn ID.', () => {
    expect(isLinkedInCompanyReference('1441')).toBe(true);
  });

  test('Should return true for a LinkedIn company URL.', () => {
    expect(
      isLinkedInCompanyReference('https://www.linkedin.com/company/google')
    ).toBe(true);
  });

  test('Should return false for a company name.', () => {
    expect(isLinkedInCompanyReference('Capital One')).toBe(false);
    expect(isLinkedInCompanyReference('JPMorgan Chase & Co.')).toBe(false);
    expect(isLinkedInCompanyReference('Google')).toBe(false);
  });
});

describe(parseLinkedInCompanySlug.name, () => {
  test('Should extract the slug from a LinkedIn company URL.', () => {
    expect(
      parseLinkedInCompanySlug('https://www.linkedin.com/company/capital-one/')
    ).toBe('capital-one');
  });

  test('Should strip a leading "@" from a slug.', () => {
    expect(parseLinkedInCompanySlug('@google')).toBe('google');
  });
});
