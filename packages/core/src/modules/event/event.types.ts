import { z } from 'zod';

import {
  Email,
  Entity,
  type ExtractValue,
  NullishString,
  Student,
} from '@oyster/types';

// Enums

export const EventType = {
  IRL: 'irl',
  VIRTUAL: 'virtual',
} as const;

// Domain

export const Event = z.object({
  createdAt: Entity.shape.createdAt,
  description: NullishString,
  endTime: z.coerce.date(),
  externalLink: z.string().url().nullable(),
  id: Entity.shape.id,
  name: z.string().trim().min(1),
  recordingLink: z.string().url().nullish(),
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

// Use Cases

export const AddEventRecordingLinkInput = Event.pick({
  recordingLink: true,
});

export type AddEventRecordingLinkInput = z.infer<
  typeof AddEventRecordingLinkInput
>;

// Types

export type Event = z.infer<typeof Event>;
export type EventAttendee = z.infer<typeof EventAttendee>;
export type EventType = ExtractValue<typeof EventType>;
