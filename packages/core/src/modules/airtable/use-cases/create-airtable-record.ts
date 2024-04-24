import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import {
  AIRTABLE_API_KEY,
  AIRTABLE_API_URI,
  airtableRateLimiter,
} from '../airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/create-records
 */
export async function createAirtableRecord({
  baseId,
  data,
  tableName,
}: GetBullJobData<'airtable.record.create'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await airtableRateLimiter.process();

  await fetch(`${AIRTABLE_API_URI}/${baseId}/${tableName}`, {
    body: JSON.stringify({
      fields: data,

      // This means that if there is a select field (whether single or multi),
      // if the value we send to Airtable is not already there, it should
      // create that value instead of failing.
      typecast: true,
    }),
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'post',
  });

  console.log({
    code: 'airtable_record_created',
    message: 'Airtable record was created.',
  });
}
