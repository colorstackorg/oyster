import { RateLimiter } from '@/shared/utils/rate-limiter';

// Environment Variables

export const { AIRTABLE_API_KEY, AIRTABLE_FAMILY_BASE_ID } = process.env;

// Constants

export const AIRTABLE_API_URI = 'https://api.airtable.com/v0';
export const AIRTABLE_MEMBERS_TABLE = 'Members';

// Rate Limiter

/**
 * @see https://airtable.com/developers/web/api/rate-limits
 */
export const airtableRateLimiter = new RateLimiter('airtable:connections', {
  rateLimit: 5,
  rateLimitWindow: 1,
});
