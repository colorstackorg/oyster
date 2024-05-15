import { z } from 'zod';

import {
  AIRTABLE_MEMBERS_URI,
  airtableRateLimiter,
  getAirtableHeaders,
} from '@/modules/airtable/airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/list-records
 */
export async function getAirtableRecord(email: string) {
  const url = new URL(AIRTABLE_MEMBERS_URI);

  url.searchParams.set('filterByFormula', `({Email} = "${email}")`);
  url.searchParams.set('maxRecords', '1');

  await airtableRateLimiter.process();

  const response = await fetch(url.toString(), {
    headers: getAirtableHeaders(),
    method: 'get',
  });

  const json = await response.json();

  const [record] = z
    .object({ id: z.string().min(1) })
    .array()
    .parse(json.records);

  return record;
}
