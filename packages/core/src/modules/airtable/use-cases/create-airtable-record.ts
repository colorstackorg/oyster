import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import { ErrorWithContext } from '@/shared/errors';
import {
  AIRTABLE_API_URI,
  airtableRateLimiter,
  getAirtableHeaders,
} from '../airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/create-records
 */
export async function createAirtableRecord({
  airtableBaseId,
  airtableTableId,
  data,
}: GetBullJobData<'airtable.record.create'>) {
  // if (!IS_PRODUCTION) {
  //   return;
  // }

  await airtableRateLimiter.process();

  const response = await fetch(
    `${AIRTABLE_API_URI}/${airtableBaseId}/${airtableTableId}`,
    {
      body: JSON.stringify({
        fields: data,

        // This means that if there is a select field (whether single or multi),
        // if the value we send to Airtable is not already there, it should
        // create that value instead of failing.
        typecast: true,
      }),
      headers: getAirtableHeaders({ includeContentType: true }),
      method: 'post',
    }
  );

  if (!response.ok) {
    throw new ErrorWithContext('Failed to create Airtable record.').withContext(
      data
    );
  }

  console.log({
    code: 'airtable_record_created',
    message: 'Airtable record was created.',
  });

  const json = await response.json();

  return json.id as string;
}
