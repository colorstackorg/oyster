import { z, type ZodError } from 'zod';

export const FileLike = z.custom<File>((value) => {
  return (
    !!value &&
    typeof value === 'object' &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value &&
    'text' in value &&
    'type' in value
  );
}, 'This is not a valid file object.');

/**
 * Returns the error message that lives within the `error`. Note that even if
 * there are multiple errors, this will only return the message from the first
 * error that it finds.
 *
 * @param error - `ZodError` to extract singular error message from.
 */
export function extractZodErrorMessage(
  error: ZodError,
  defaultMessage: string = 'A validation error occurred.'
): string {
  const [issue] = error.issues;

  if (issue) {
    return `"${issue.path.join('.')}" - ${issue.message}`;
  }

  return defaultMessage;
}

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new Error(extractZodErrorMessage(result.error));
  }

  return result.data;
}

export const zodErrorMap: z.ZodErrorMap = (
  issue: z.ZodIssueOptionalMessage,
  ctx: z.ErrorMapCtx
) => {
  let message: string | undefined = (() => {
    switch (issue.code) {
      case 'invalid_type':
        return `Expected ${issue.expected}, but received ${issue.received}.`;

      case 'invalid_string': {
        if (issue.validation === 'email') {
          return `"${ctx.data}" is not a valid email.`;
        }

        break;
      }

      default:
        return ctx.defaultError;
    }
  })();

  message = message || ctx.defaultError;
  message = message.endsWith('.') ? message : `${message}.`;

  return {
    message,
  };
};
