import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import {
  AIRTABLE_API_URI,
  airtableRateLimiter,
  getAirtableHeaders,
} from '../airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/update-record
 */
export async function updateAirtableRecord({
  airtableBaseId,
  airtableRecordId,
  airtableTableId,
  data,
}: GetBullJobData<'airtable.record.update'>) {
  // if (!IS_PRODUCTION) {
  //   return;
  // }

  await airtableRateLimiter.process();

  const response = await fetch(
    `${AIRTABLE_API_URI}/${airtableBaseId}/${airtableTableId}/${airtableRecordId}`,
    {
      body: JSON.stringify({
        fields: data,
        typecast: true,
      }),
      headers: getAirtableHeaders({ includeContentType: true }),
      method: 'PATCH',
    }
  );

  console.log({
    code: 'airtable_record_updated',
    message: 'Airtable record was updated.',
    data: {
      airtableBaseId,
      airtableRecordId,
      airtableTableId,
      data,
    },
  });

  const json = await response.json();

  return json.id as string;
}
