import { ZodError } from 'zod';

import { extractZodErrorMessage } from '@/shared/utils/zod.utils';

export type ErrorContext<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T;

export type ErrorLevel = 'error' | 'warning';

/**
 * This is an error that can be used to pass additional context to the error
 * beyond just a message. This is especially useful when using a service like
 * Sentry to capture errors, b/c we can pass that context to Sentry and it
 * will be included in the error report.
 */
export class ErrorWithContext extends Error {
  context?: ErrorContext;

  level?: ErrorLevel;

  withContext(context: ErrorContext): this {
    this.context = context;
    return this;
  }

  withLevel(level: ErrorLevel): this {
    this.level = level;
    return this;
  }
}

// Core Errors

export class NotFoundError extends ErrorWithContext {}

export class NotImplementedError extends ErrorWithContext {
  message = 'TODO: Implement me...';
}

// Zod Errors

export class ZodParseError extends ErrorWithContext {
  constructor(error: ZodError) {
    super();

    this.message = extractZodErrorMessage(error);
    this.context = error.formErrors.fieldErrors;
  }
}
