import { z } from 'zod';

import { Student } from './student';
import { Demographic, OtherDemographic } from './types';

// Enums

const ApplicationStatus = {
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;

// Schemas

export const Application = Student.pick({
  acceptedAt: true,
  createdAt: true,
  educationLevel: true,
  firstName: true,
  fullName: true,
  gender: true,
  graduationDate: true,
  id: true,
  lastName: true,
  linkedInUrl: true,
  major: true,
  otherMajor: true,
  otherSchool: true,
  race: true,
  schoolId: true,
})
  .required({ linkedInUrl: true })
  .partial({ acceptedAt: true })
  .extend({
    contribution: z.string().trim().min(1),
    email: z
      .string()
      .trim()
      .min(1)
      .email()
      .refine((value) => {
        return (
          value.endsWith('.edu') ||
          value.endsWith('.ca') ||
          value.endsWith('mymdc.net') ||
          value.endsWith('@colorstack.org')
        );
      }, 'Must be a valid .edu email.')
      .transform((value) => {
        return value.toLowerCase();
      }),
    goals: z.string().trim().min(1),
    otherDemographics: z
      .union([z.nativeEnum(Demographic), z.nativeEnum(OtherDemographic)])
      .array()
      .min(1)
      .transform((demographics) => demographics.sort()),
    referralId: z.string().trim().min(1).optional(),
    rejectedAt: z.coerce.date().optional(),
    reviewedById: z.string().trim().min(1).optional(),
    status: z.nativeEnum(ApplicationStatus),
  });

// Types

export type Application = z.infer<typeof Application>;
