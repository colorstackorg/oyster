import { RateLimiter } from '@/shared/utils/rate-limiter';

// Rate Limiter

/**
 * @see https://data.crunchbase.com/docs/using-the-api#collections
 */
export const crunchbaseRateLimiter = new RateLimiter('crunchbase:connections', {
  rateLimit: 200,
  rateLimitWindow: 60,
});

// Helpers

export function getCrunchbaseKey() {
  const key = process.env.CRUNCHBASE_BASIC_API_KEY as string;

  if (!key) {
    throw new Error(
      '"CRUNCHBASE_BASIC_API_KEY" environment variable is missing.'
    );
  }

  return key;
}

export function getCrunchbaseLogoUri(imageId: string) {
  return `https://images.crunchbase.com/image/upload/c_lpad,h_64,w_64,f_auto,b_white,q_auto:eco,dpr_1/${imageId}`;
}

export function getCrunchbasePathname(pathname: string) {
  return 'https://api.crunchbase.com/api/v4' + pathname;
}
