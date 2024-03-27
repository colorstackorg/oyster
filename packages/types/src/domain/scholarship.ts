import { z } from 'zod';

import { ExtractValue } from '../shared/types';
import { Student } from './student';
import { Entity } from './types';

// Enums

export const ScholarshipType = {
  CONFERENCE: 'conference',
  DIRECT: 'direct',
  TUITION: 'tuition',
} as const;

// Schemas

export const ScholarshipRecipient = Entity.extend({
  amount: z.number().int().positive(),
  awardedAt: z.date(),
  reason: z.string().min(1),
  type: z.nativeEnum(ScholarshipType),
  studentId: Student.shape.id,
});

// Types

export type ScholarshipRecipient = z.infer<typeof ScholarshipRecipient>;
export type ScholarshipType = ExtractValue<typeof ScholarshipType>;
