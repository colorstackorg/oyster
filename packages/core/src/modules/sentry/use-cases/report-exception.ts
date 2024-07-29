import * as Sentry from '@sentry/node';

import { type ErrorContext, ErrorWithContext } from '@/shared/errors';

export function reportException(error: unknown): void {
  let context: ErrorContext | undefined = undefined;

  if (error instanceof ErrorWithContext && error.context) {
    context = error.context;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}
