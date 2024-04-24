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

export async function deleteAirtableRecord({
  email,
}: GetBullJobData<'airtable.record.delete'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  const record = await getAirtableRecord(email);

  if (!record) {
    throw new NotFoundError('Airtable record not found.').withContext({
      email,
    });
  }

  await airtableRateLimiter.process();

  await fetch(
    `${AIRTABLE_API_URI}/${AIRTABLE_FAMILY_BASE_ID}/${AIRTABLE_MEMBERS_TABLE}/${record.id}`,
    {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      method: 'delete',
    }
  );

  console.log({
    code: 'airtable_record_deleted',
    message: 'Airtable record was deleted.',
    data: {
      airtableId: record.id,
      email,
    },
  });
}
