import { sleep } from '@oyster/utils';

export type Result<T = object, E = object> =
  | {
      data: T;
      ok: true;
    }
  | {
      code: number;
      context?: E;
      error: string;
      ok: false;
    };

type ErrorResult<E> = Extract<Result<unknown, E>, { ok: false }>;
type SuccessResult<T> = Extract<Result<T>, { ok: true }>;

/**
 * Returns a "failed" result object, including the error code and message.
 *
 * This and the `success` function are intended to be used together to create a
 * standard way of returning results from core functions.
 */
export function fail<E>(
  input: Pick<ErrorResult<E>, 'code' | 'context' | 'error'>
): ErrorResult<E> {
  return {
    code: input.code,
    context: input.context,
    error: input.error,
    ok: false,
  };
}

/**
 * Returns a "successful" result object, including the data that was returned.
 *
 * This and the `fail` function are intended to be used together to create a
 * standard way of returning results from core functions.
 */
export function success<T>(data: T): SuccessResult<T> {
  return {
    data,
    ok: true,
  };
}

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
