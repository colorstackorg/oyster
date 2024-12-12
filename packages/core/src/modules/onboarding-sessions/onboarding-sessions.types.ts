import { z } from 'zod';

import { Entity, Student } from '@oyster/types';

export const OnboardingSession = Entity.extend({
  date: z.string().trim().min(1),
  group: z.coerce.number().min(1),
});

export type OnboardingSession = z.infer<typeof OnboardingSession>;

export const OnboardingSessionAttendee = Entity.extend({
  sessionId: OnboardingSession.shape.id,
  studentId: Student.shape.id,
});

export type OnboardingSessionAttendee = z.infer<
  typeof OnboardingSessionAttendee
>;
