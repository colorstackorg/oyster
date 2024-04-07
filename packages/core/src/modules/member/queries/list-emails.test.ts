import { describe, test, expect } from 'bun:test';

import { student1, student1Emails } from '@oyster/db/test/constants';

import { listEmails } from './list-emails';

describe(listEmails.name, () => {
  test("Should return all of the member's emails.", async () => {
    const emails = await listEmails(student1.id);

    expect(emails.length).toBe(student1Emails.length);

    expect(emails).toEqual(
      student1Emails.map(({ email }) => {
        return {
          email,
          primary: email === student1.email,
        };
      })
    );
  });
});
