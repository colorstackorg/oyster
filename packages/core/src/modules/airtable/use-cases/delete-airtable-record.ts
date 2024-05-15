import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import {
  AIRTABLE_MEMBERS_URI,
  airtableRateLimiter,
  getAirtableHeaders,
} from '../airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/delete-record
 */
export async function deleteAirtableRecord({
  airtableId,
}: GetBullJobData<'airtable.record.delete'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await airtableRateLimiter.process();

  await fetch(`${AIRTABLE_MEMBERS_URI}/${airtableId}`, {
    headers: getAirtableHeaders(),
    method: 'delete',
  });

  console.log({
    code: 'airtable_record_deleted',
    message: 'Airtable record was deleted.',
    data: { airtableId },
  });
}
