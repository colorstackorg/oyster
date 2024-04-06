import * as Sentry from '@sentry/node';

import {
  type ErrorContext,
  type ErrorLevel,
  ErrorWithContext,
} from '@/shared/errors';

export function reportError(error: unknown): void {
  let context: ErrorContext | undefined = undefined;
  let level: ErrorLevel = 'error';

  if (error instanceof ErrorWithContext && error.context) {
    context = error.context;
  }

  if (error instanceof ErrorWithContext && error.level) {
    level = error.level;
  }

  Sentry.captureException(error, {
    extra: context,
    level,
  });
}
