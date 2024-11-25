import { z } from 'zod';

import { Email } from '@oyster/types';

import { FileLike } from '@/shared/utils/zod.utils';

// Schemas

export const ScholarshipRecipient = z.object({
  amount: z.coerce.number().int().positive(),
  awardDate: z.date(),
  email: Email,
  id: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  studentId: z.string().trim().min(1).optional(),
  type: z.enum(['conference', 'direct', 'tuition']),
});

export const ImportRecipientsInput = z.object({
  file: FileLike,
});

// Types

export type ImportRecipientsInput = z.infer<typeof ImportRecipientsInput>;
export type ScholarshipRecipient = z.infer<typeof ScholarshipRecipient>;
