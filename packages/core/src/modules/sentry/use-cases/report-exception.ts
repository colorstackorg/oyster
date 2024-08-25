import * as Sentry from '@sentry/node';

import { type ErrorContext, ErrorWithContext } from '@/shared/errors';

export function reportException(error: unknown, context?: ErrorContext): void {
  let extra: Record<string, unknown> | undefined;

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
