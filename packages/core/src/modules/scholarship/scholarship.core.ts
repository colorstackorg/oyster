import dayjs from 'dayjs';
import { z } from 'zod';

import { db } from '@oyster/db';
import { Email } from '@oyster/types';
import { id } from '@oyster/utils';

import { getMemberByEmail } from '@/modules/member/queries/get-member-by-email';
import {
  type ImportScholarshipRecipientsInput,
  ScholarshipRecipient,
  type ScholarshipType,
} from '@/modules/scholarship/scholarship.types';
import { ColorStackError } from '@/shared/errors';
import { parseCsv } from '@/shared/utils/csv.utils';

const TYPE_FROM_CSV: Record<string, ScholarshipType> = {
  Conference: 'conference',
  Direct: 'direct',
  Tuition: 'tuition',
};

const ScholarshipRecipientRow = z.object({
  Amount: z.coerce.number(),

  // If the date is valid, then we'll just set to the 12th hour of the day. We
  // chose that arbitrarily so that all timezones would show the same date.
  'Award Date': z
    .string()
    .refine((value) => dayjs(value).isValid())
    .transform((value) => dayjs(value).hour(12).toDate()),

  Email: Email,

  Reason: z.string(),

  // In order for the CSV to be more friendly to our admins, we'll require
  // them to use the title-case version of the scholarship type.
  Type: z.string().transform((value) => TYPE_FROM_CSV[value]),
});

export async function importScholarshipRecipients({
  file,
}: ImportScholarshipRecipientsInput) {
  const text = await file.text();

  const records = await parseCsv(text);

  if (!records.length) {
    throw new Error(
      'There must be at least one row in order to import scholarship recipients.'
    );
  }

  const result = z.array(ScholarshipRecipientRow).safeParse(records);

  if (!result.success) {
    throw new ColorStackError()
      .withMessage('There was an error parsing the records.')
      .withContext({ records })
      .report();
  }

  const recipients = await Promise.all(
    records.map(async (record) => {
      const {
        'Award Date': awardedAt,
        Amount: amount,
        Email: email,
        Reason: reason,
        Type: type,
      } = record;

      const member = await getMemberByEmail(email);

      return ScholarshipRecipient.parse({
        amount,
        awardedAt,
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
