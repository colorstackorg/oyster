import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { getAirtableRecord } from '@/modules/airtable/queries/get-airtable-record';
import { IS_PRODUCTION } from '@/shared/env';
import { NotFoundError } from '@/shared/errors';
import {
  AIRTABLE_API_KEY,
  AIRTABLE_API_URI,
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE,
  airtableRateLimiter,
} from '../airtable.shared';

export async function updateAirtableRecord({
  newEmail,
  previousEmail,
}: GetBullJobData<'airtable.record.update'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  const record = await getAirtableRecord(previousEmail);

  if (!record) {
    throw new NotFoundError('Airtable record not found.').withContext({
      email: previousEmail,
    });
  }

  await airtableRateLimiter.process();

  await fetch(
    `${AIRTABLE_API_URI}/${AIRTABLE_FAMILY_BASE_ID}/${AIRTABLE_MEMBERS_TABLE}/${record.id}`,
    {
      body: JSON.stringify({ Email: newEmail }),
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'patch',
    }
  );

  console.log({
    code: 'airtable_record_updated',
    message: 'Airtable record was updated.',
    data: {
      airtableId: record.id,
      previousRecord: previousEmail,
      updatedRecord: newEmail,
    },
  });
}
