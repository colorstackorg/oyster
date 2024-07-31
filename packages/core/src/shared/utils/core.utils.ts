import { sleep } from '@oyster/utils';

export type Result<T = object> =
  | {
      data: T;
      ok: true;
    }
  | {
      code: 400 | 401 | 403 | 404 | 409;
      error: string;
      ok: false;
    };

export const result = {
  fail({
    code,
    error,
  }: Pick<Extract<Result, { ok: false }>, 'code' | 'error'>): Result {
    return {
      code,
      error,
      ok: false,
    };
  },

  success<T>(data: T): Result<T> {
    return {
      data,
      ok: true,
    };
  },
};

type RetryUntilFinishedOptions = {
  maxRetries: number;
  retryInterval: number;
};

/**
 * Retries the specified function until it returns a non-null value or the
 * maximum number of retries has been reached.
 *
 * After each failed attempt, the function will sleep for the specified number
 * of milliseconds.
 */
export async function retryWithBackoff<T>(
  fn: (...args: unknown[]) => Promise<T>,
  { maxRetries, retryInterval }: RetryUntilFinishedOptions
): Promise<T | null> {
  let result: T | null = null;
  let retries: number = 0;

  while (retries < maxRetries) {
    try {
      result = await fn();

      if (!result) {
        throw new Error('Result is not truthy.');
      }

      break;
    } catch (e) {
      // If this is the last retry, throw the error so that it can be handled
      // by the caller.
      if (retries === maxRetries - 1) {
        throw e;
      }

      await sleep(retryInterval);
    }

    retries++;
  }

  return result;
}
