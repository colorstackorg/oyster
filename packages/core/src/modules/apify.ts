import { z, type ZodType } from 'zod';

import { ColorStackError } from '@/shared/errors';
import { RateLimiter } from '@/shared/utils/rate-limiter';
import { extractZodErrorMessage } from '@/shared/utils/zod';

// Constants

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;

// Rate Limiter

const rateLimiter = new RateLimiter('apify:connections', {
  rateLimit: 25,
  rateLimitWindow: null,
});

// Core

const StartRunResponse = z.object({
  data: z.object({
    defaultDatasetId: z.string(),
  }),
});

type StartRunInput = {
  actorId: string;
  body: Record<string, unknown>;
};

/**
 * Starts a LinkedIn Profile scraper run in Apify. This function does not return
 * the LinkedIn data. We wait for the run to finish and then get the dataset ID,
 * which we'll use in another function to get the actual LinkedIn data.
 *
 * @param input - LinkedIn profile URL to scrape.
 * @returns Promise resolving to the start result.
 */
export async function startRun({
  actorId,
  body,
}: StartRunInput): Promise<string> {
  return rateLimiter.doWhenAvailable(fn);

  async function fn() {
    const url = new URL(`https://api.apify.com/v2/acts/${actorId}/runs`);

    url.searchParams.set('token', APIFY_API_TOKEN);
    url.searchParams.set('waitForFinish', '60');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ColorStackError()
        .withMessage('Failed to start run in Apify.')
        .withContext({ data, status: response.status })
        .report();
    }

    const startResult = StartRunResponse.safeParse(data);

    if (!startResult.success) {
      throw new ColorStackError()
        .withMessage('Failed to parse run from Apify.')
        .withContext({
          data,
          error: extractZodErrorMessage(startResult.error),
        })
        .report();
    }

    const { defaultDatasetId } = startResult.data.data;

    return defaultDatasetId;
  }
}

/**
 * Gets the LinkedIn profile dataset from Apify. This function uses the dataset
 * ID from the start run to get the actual LinkedIn data.
 *
 * @param datasetId - Dataset ID to get the LinkedIn profile data for.
 * @returns Promise resolving to the LinkedIn profile data.
 */
export async function getDataset<Schema extends ZodType>(
  datasetId: string,
  schema: Schema
): Promise<z.infer<Schema>> {
  const url = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);

  url.searchParams.set('token', APIFY_API_TOKEN);

  const response = await fetch(url);

  const data = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to get dataset from Apify.')
      .withContext({ response: data, status: response.status })
      .report();
  }

  const apifyResult = schema.safeParse(data);

  if (!apifyResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse dataset from Apify.')
      .withContext({ data, error: extractZodErrorMessage(apifyResult.error) })
      .report();
  }

  return apifyResult.data;
}
