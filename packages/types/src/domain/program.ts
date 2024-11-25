import { z } from 'zod';

import { Student } from './student';
import { Entity } from './types';

// Schemas

export const Program = Entity.extend({
  endDate: z.string().min(1),
  name: z.string().min(1),
  startDate: z.string().min(1),
});

export const ProgramParticipant = Entity.extend({
  email: Student.shape.email.optional(),
  programId: Program.shape.id,
  studentId: Student.shape.id.optional(),
});

// Types

export type Program = z.infer<typeof Program>;
export type ProgramParticipant = z.infer<typeof ProgramParticipant>;
