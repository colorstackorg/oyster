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
 * @see https://airtable.com/developers/web/api/update-record
 */
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

  await fetch(`${AIRTABLE_MEMBERS_URI}/${record.id}`, {
    body: JSON.stringify({
      fields: { Email: newEmail },
    }),
    headers: getAirtableHeaders({ includeContentType: true }),
    method: 'patch',
  });

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
