import { z } from 'zod';

import { Student } from './student';
import { Email, Entity } from './types';
import { type ExtractValue } from '../shared/types';
import { NullishString } from '../shared/zod';

// Enums

export const EventType = {
  IRL: 'irl',
  VIRTUAL: 'virtual',
} as const;

// Schemas

export const Event = z.object({
  createdAt: Entity.shape.createdAt,
  description: NullishString,
  endTime: z.coerce.date(),
  externalLink: z.string().url().nullable(),
  id: Entity.shape.id,
  name: z.string().trim().min(1),
  startTime: z.coerce.date(),
  type: z.nativeEnum(EventType),
});

export const EventAttendee = z.object({
  createdAt: Entity.shape.createdAt,
  email: Email,
  eventId: Event.shape.id,
  name: NullishString,
  studentId: Student.shape.id.optional(),
});

export const EventRegistration = z.object({
  email: Email,
  eventId: Event.shape.id,
  registeredAt: z.coerce.date(),
  studentId: Student.shape.id,
});

// Types

export type Event = z.infer<typeof Event>;
export type EventAttendee = z.infer<typeof EventAttendee>;
export type EventRegistration = z.infer<typeof EventRegistration>;
export type EventType = ExtractValue<typeof EventType>;
