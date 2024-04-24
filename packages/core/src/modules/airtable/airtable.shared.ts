import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

export const AIRTABLE_FAMILY_BASE_ID = process.env.AIRTABLE_FAMILY_BASE_ID;

// Constants

export const AIRTABLE_API_URI = 'https://api.airtable.com/v0';
export const AIRTABLE_MEMBERS_TABLE = 'Members';
export const AIRTABLE_MEMBERS_URI = `${AIRTABLE_API_URI}/${AIRTABLE_FAMILY_BASE_ID}/${AIRTABLE_MEMBERS_TABLE}`;

// Rate Limiter

/**
 * @see https://airtable.com/developers/web/api/rate-limits
 */
export const airtableRateLimiter = new RateLimiter('airtable:connections', {
  rateLimit: 5,
  rateLimitWindow: 1,
});

// Functions

export function getAirtableHeaders(
  options: { includeContentType: boolean } = { includeContentType: false }
) {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    ...(options.includeContentType && {
      'Content-Type': 'application/json',
    }),
  };
}
