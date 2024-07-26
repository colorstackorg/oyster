import { z } from 'zod';

import { Email, type ExtractValue } from '@oyster/types';

import { FileLike } from '@/shared/utils/zod.utils';

// Enums

export const ScholarshipType = {
  CONFERENCE: 'conference',
  DIRECT: 'direct',
  TUITION: 'tuition',
} as const;

// Schemas

export const ScholarshipRecipient = z.object({
  amount: z.number().int().positive(),
  awardedAt: z.date(),
  email: Email,
  id: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  studentId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(ScholarshipType),
});

export const ImportScholarshipRecipientsInput = z.object({
  file: FileLike,
});

// Types

export type ImportScholarshipRecipientsInput = z.infer<
  typeof ImportScholarshipRecipientsInput
>;
export type ScholarshipRecipient = z.infer<typeof ScholarshipRecipient>;
export type ScholarshipType = ExtractValue<typeof ScholarshipType>;
