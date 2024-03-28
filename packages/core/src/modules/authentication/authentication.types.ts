import { z } from 'zod';

import { Email, Entity, ExtractValue, Student } from '@oyster/types';

// Schemas

export const OneTimeCodePurpose = {
  ADD_STUDENT_EMAIL: 'add_student_email',
  ADMIN_LOGIN: 'admin_login',
  STUDENT_LOGIN: 'student_login',
} as const;

export const OneTimeCode = Entity.extend({
  adminId: z.string().trim().min(1).optional(),
  email: Email,
  purpose: z.nativeEnum(OneTimeCodePurpose),
  studentId: Student.shape.id.optional(),
  value: z.string().trim().length(6),
});

export const SendOneTimeCodeInput = OneTimeCode.pick({
  email: true,
  purpose: true,
});

export const VerifyOneTimeCodeInput = OneTimeCode.pick({
  id: true,
  value: true,
});

// OAuth 2.0

export const OAuthCodeState = z.object({
  clientRedirectUrl: z.string().url(),

  /**
   * This provides context for what the application should do after the user
   * is authenticated. In our case, this will tell us whether we want to lookup
   * an admin record or a student record.
   */
  context: z.enum(['admin_login', 'student_login']),

  oauthRedirectUrl: z.custom<`${string}/oauth/${string}`>((value) => {
    const { success } = z.string().url().safeParse(value);
    return success;
  }),
});

// Types

export type OAuthCodeState = z.infer<typeof OAuthCodeState>;
export type OneTimeCode = z.infer<typeof OneTimeCode>;
export type OneTimeCodePurpose = ExtractValue<typeof OneTimeCodePurpose>;
export type SendOneTimeCodeInput = z.infer<typeof SendOneTimeCodeInput>;
export type VerifyOneTimeCodeInput = z.infer<typeof VerifyOneTimeCodeInput>;
