import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { getAirtableRecord } from '@/modules/airtable/queries/get-airtable-record';
import { IS_PRODUCTION } from '@/shared/env';
import { NotFoundError } from '@/shared/errors';
import {
  AIRTABLE_MEMBERS_URI,
  airtableRateLimiter,
  getAirtableHeaders,
} from '../airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/delete-record
 */
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

  await fetch(`${AIRTABLE_MEMBERS_URI}/${record.id}`, {
    headers: getAirtableHeaders(),
    method: 'delete',
  });

  console.log({
    code: 'airtable_record_deleted',
    message: 'Airtable record was deleted.',
    data: {
      airtableId: record.id,
      email,
    },
  });
}
