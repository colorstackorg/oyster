import { type z } from 'zod';

import { Application, BooleanInput, type ExtractValue } from '@oyster/types';

// Enums

export const ApplicationRejectionReason = {
  BAD_LINKEDIN: 'bad_linkedin',
  EMAIL_ALREADY_USED: 'email_already_used',
  EMAIL_BOUNCED: 'email_bounced',
  INELIGIBLE_MAJOR: 'ineligible_major',
  IS_INTERNATIONAL: 'is_international',
  NOT_UNDERGRADUATE: 'not_undergraduate',
  OTHER: 'other',
} as const;

export const ApplicationStatus = {
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;

export type ApplicationRejectionReason = ExtractValue<
  typeof ApplicationRejectionReason
>;

export type ApplicationStatus = ExtractValue<typeof ApplicationStatus>;

// Use Cases

export const ApplyInput = Application.pick({
  contribution: true,
  educationLevel: true,
  email: true,
  firstName: true,
  gender: true,
  goals: true,
  graduationMonth: true,
  graduationYear: true,
  lastName: true,
  linkedInUrl: true,
  major: true,
  otherDemographics: true,
  otherMajor: true,
  otherSchool: true,
  race: true,
  referralId: true,
  schoolId: true,
}).extend({
  codeOfConduct: BooleanInput,
});

export type ApplyInput = z.infer<typeof ApplyInput>;
