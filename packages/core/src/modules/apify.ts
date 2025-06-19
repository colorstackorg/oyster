import { z, type ZodType } from 'zod';

import { ColorStackError } from '@/shared/errors';
import { RateLimiter } from '@/shared/utils/rate-limiter';
import { extractZodErrorMessage } from '@/shared/utils/zod';

// Constants

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;

// Rate Limiter

/**
 * @see https://docs.apify.com/platform/limits#platform-limits
 */
const rateLimiter = new RateLimiter('apify:connections', {
  rateLimit: 32,
  rateLimitWindow: null,
});

// Core

type RunActorInput<Schema extends ZodType> = {
  actorId: string;
  body: Record<string, unknown>;
  schema: Schema;
};

/**
 * Runs an Apify actor with the given configuration and returns the parsed
 * dataset. This function handles rate limiting and data validation.
 *
 * @param actorId - ID of the Apify actor to run.
 * @param body - Input parameters for the actor run.
 * @param schema - Zod schema to validate and parse the returned dataset.
 * @returns Promise resolving to the validated dataset matching the schema type.
 */
export async function runActor<Schema extends ZodType>({
  actorId,
  body,
  schema,
}: RunActorInput<Schema>): Promise<z.infer<Schema>> {
  return rateLimiter.doWhenAvailable(async () => {
    const datasetId = await startRun({ actorId, body });
    const dataset = await getDataset(datasetId, schema);

    return dataset;
  });
}

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
 * Starts an Apify actor run with the given configuration. This function does
 * not return the actual data. Instead, it waits for the run to finish and
 * returns the dataset ID, which can be used to fetch the results using
 * `getDataset()`.
 *
 * @param actorId - ID of the Apify actor to run.
 * @param body - Input parameters for the actor run.
 * @returns Promise resolving to the dataset ID.
 */
async function startRun({ actorId, body }: StartRunInput): Promise<string> {
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

/**
 * Gets the Apify dataset from Apify. This function uses the dataset ID from
 * the start run to get the actual data.
 *
 * @param datasetId - Dataset ID to get the data for.
 * @param schema - Zod schema to validate and parse the returned dataset.
 * @returns Promise resolving to the validated dataset matching the schema type.
 */
async function getDataset<Schema extends ZodType>(
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
      .withContext({
        datasetId,
        error: JSON.stringify(apifyResult.error, null, 2),
      })
      .report();
  }

  return apifyResult.data;
}
