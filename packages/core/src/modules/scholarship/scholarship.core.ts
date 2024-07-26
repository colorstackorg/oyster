import dayjs from 'dayjs';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Email } from '@oyster/types';
import { id } from '@oyster/utils';

import { getMemberByEmail } from '@/modules/member/queries/get-member-by-email';
import {
  type ImportRecipientsInput,
  ScholarshipRecipient,
} from '@/modules/scholarship/scholarship.types';
import { ColorStackError } from '@/shared/errors';
import { parseCsv } from '@/shared/utils/csv.utils';

export { ImportRecipientsInput } from '@/modules/scholarship/scholarship.types';

const ScholarshipRecipientRow = z.object({
  Amount: ScholarshipRecipient.shape.amount,

  // If the date is valid, then we'll just set to the 12th hour of the day. We
  // chose that arbitrarily so that all timezones would show the same date.
  'Award Date': z
    .string()
    .refine((value) => dayjs(value).isValid())
    .transform((value) => dayjs(value).toDate()),

  Email: Email,

  Reason: ScholarshipRecipient.shape.reason,

  // In order for the CSV to be more friendly to our admins, we'll require
  // them to use the title-case version of the scholarship type.
  Type: z.string().transform((value) => value.toLowerCase()),
});

/**
 * Imports the scholarship recipients from a CSV file. The CSV file must have
 * the following columns:
 * - Amount
 * - Award Date
 * - Email
 * - Reason
 * - Type
 */
export async function importScholarshipRecipients({
  file,
}: ImportRecipientsInput) {
  const text = await file.text();

  const rows = await parseCsv(text);

  if (!rows.length) {
    throw new Error(
      'There must be at least one row in order to import scholarship recipients.'
    );
  }

  const result = z.array(ScholarshipRecipientRow).safeParse(rows);

  if (!result.success) {
    throw new ColorStackError()
      .withMessage('There was an error parsing the rows.')
      .withContext({ rows })
      .report();
  }

  const recipients = await Promise.all(
    result.data.map(async (row) => {
      const {
        'Award Date': awardDate,
        Amount: amount,
        Email: email,
        Reason: reason,
        Type: type,
      } = row;

      const member = await getMemberByEmail(email);

      return ScholarshipRecipient.parse({
        amount,
        awardDate,
        email,
        id: id(),
        reason,
        studentId: member?.id,
        type,
      });
    })
  );

  await db
    .insertInto('scholarshipRecipients')
    .values(recipients)
    .onConflict((oc) => oc.doNothing())
    .execute();

  return {
    count: recipients.length,
  };
}
