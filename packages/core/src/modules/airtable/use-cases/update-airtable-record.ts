import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import {
  AIRTABLE_MEMBERS_URI,
  airtableRateLimiter,
  getAirtableHeaders,
} from '../airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/update-record
 */
export async function updateAirtableRecord({
  airtableId,
  data,
}: GetBullJobData<'airtable.record.update'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await airtableRateLimiter.process();

  await fetch(`${AIRTABLE_MEMBERS_URI}/${airtableId}`, {
    body: JSON.stringify({
      fields: {
        ...(data.email && { Email: data.email }),
        ...(data.graduationYear && {
          'Expected Graduation Year': data.graduationYear,
        }),
        ...(data.school && { School: data.school }),
      },
    }),
    headers: getAirtableHeaders({ includeContentType: true }),
    method: 'PATCH',
  });

  console.log({
    code: 'airtable_record_updated',
    message: 'Airtable record was updated.',
    data: {
      airtableId,
      data,
    },
  });
}
