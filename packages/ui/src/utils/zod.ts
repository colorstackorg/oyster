import { z } from 'zod';

const NAN: string = 'nan';
const NULL: string = 'null';
const UNDEFINED: string = 'undefined';

const REQUIRED_ERROR_MESSAGE: string = 'This field is required.';

export const zodErrorMap: z.ZodErrorMap = (
  issue: z.ZodIssueOptionalMessage,
  ctx: z.ErrorMapCtx
) => {
  let message: string | undefined = (() => {
    switch (issue.code) {
      case 'invalid_enum_value': {
        if (!issue.received) {
          return REQUIRED_ERROR_MESSAGE;
        }

        break;
      }

      case 'invalid_string': {
        if (issue.validation === 'email') {
          return 'Please input a valid email address.';
        }

        if (issue.validation === 'url') {
          return 'Please input a valid URL.';
        }

        break;
      }

      case 'invalid_type': {
        if (
          issue.received === NAN ||
          issue.received === NULL ||
          issue.received === UNDEFINED
        ) {
          return REQUIRED_ERROR_MESSAGE;
        }

        break;
      }

      case 'too_small': {
        if (!ctx.data || !ctx.data.length) {
          return REQUIRED_ERROR_MESSAGE;
        }
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
