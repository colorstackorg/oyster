import Airtable from 'airtable';

import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY as string;
const AIRTABLE_FAMILY_BASE_ID = process.env.AIRTABLE_FAMILY_BASE_ID as string;

// Rate Limiter

/**
 * @see https://airtable.com/developers/web/api/rate-limits
 */
export const airtableRateLimiter = new RateLimiter('airtable:connections', {
  rateLimit: 5,
  rateLimitWindow: 1,
});

// Helpers

export async function getAirtableRecord(email: string) {
  const table = getMembersAirtable();

  await airtableRateLimiter.process();

  const [record] = await table
    .select({
      fields: [],
      filterByFormula: `({Email} = "${email}")`,
      maxRecords: 1,
    })
    .firstPage();

  return record;
}

export function getMembersAirtable() {
  const airtable = getAirtableInstance();
  const base = airtable.base(AIRTABLE_FAMILY_BASE_ID);
  const table = base('Members');

  return table;
}

export function getAirtableInstance() {
  if (!AIRTABLE_API_KEY) {
    throw new Error(
      '"AIRTABLE_API_KEY" is not set, so Airtable integration is disabled.'
    );
  }

  return new Airtable({
    apiKey: AIRTABLE_API_KEY,
  });
}
