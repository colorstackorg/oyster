import { z } from 'zod';

import {
  AIRTABLE_API_URI,
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE,
  getAirtableHeaders,
} from '@/modules/airtable/airtable.shared';

/**
 * @see https://airtable.com/developers/web/api/list-records
 */
export async function getAirtableRecord(email: string) {
  const url = new URL(
    `${AIRTABLE_API_URI}/${AIRTABLE_FAMILY_BASE_ID}/${AIRTABLE_MEMBERS_TABLE}`
  );

  url.searchParams.set('fields', '[]');
  url.searchParams.set('filterByFormula', `({Email} = "${email}")`);
  url.searchParams.set('maxRecords', '1');

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
