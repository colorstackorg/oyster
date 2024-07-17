import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

export const AIRTABLE_FAMILY_BASE_ID = process.env.AIRTABLE_FAMILY_BASE_ID;
export const AIRTABLE_MEMBERS_TABLE_ID = process.env.AIRTABLE_MEMBERS_TABLE_ID;

// Constants

export const AIRTABLE_API_URI = 'https://api.airtable.com/v0';

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
