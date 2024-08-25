import * as Sentry from '@sentry/node';

import { type ErrorContext, ErrorWithContext } from '@/shared/errors';

/**
 * Reports an exception to Sentry and logs the error to the console.
 *
 * @param error - The error-like object to report.
 * @param context - Additional context to report with the error.
 */
export function reportException(error: unknown, context?: ErrorContext): void {
  let extra: ErrorContext | undefined;

  const isErrorWithContext = error instanceof ErrorWithContext;

  if (context || isErrorWithContext) {
    extra = {
      ...context,
      ...(isErrorWithContext && error.context),
    };
  }

  Sentry.captureException(error, {
    extra,
  });

  console.error(error, extra);
}
