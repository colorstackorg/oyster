import { z } from 'zod';

import { Email, Entity, Event, Student } from '@oyster/types';

// Domain

export const Survey = z.object({
  createdAt: Entity.shape.createdAt,
  description: z.string().trim().min(1).nullable().catch(null),
  eventId: Event.shape.id.nullable().catch(null),
  id: Entity.shape.id,
  title: z.string().trim().min(1),
});

export type Survey = z.infer<typeof Survey>;

export const SurveyResponse = z.object({
  createdAt: Entity.shape.createdAt,
  email: Email,
  firstName: z.string().trim().min(1),
  id: Entity.shape.id,
  lastName: z.string().trim().min(1),
  respondedOn: z.coerce.date(),
  studentId: Student.shape.id.optional(),
  surveyId: Survey.shape.id,
});

export type SurveyResponse = z.infer<typeof SurveyResponse>;

// Use Case(s)

export const AddSurveyResponseInput = SurveyResponse.pick({
  email: true,
  firstName: true,
  id: true,
  lastName: true,
  respondedOn: true,
  studentId: true,
  surveyId: true,
});

type AddSurveyResponseInput = z.infer<typeof CreateSurveyInput>;

export const CreateSurveyInput = Survey.pick({
  description: true,
  eventId: true,
  title: true,
});

export type CreateSurveyInput = z.infer<typeof CreateSurveyInput>;
