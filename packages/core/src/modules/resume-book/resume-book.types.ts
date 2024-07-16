import dayjs from 'dayjs';
import { z } from 'zod';

import { Entity, Student } from '@oyster/types';

// Domain

const ResumeBook = z.object({
  airtableBaseId: z.string().trim().min(1),
  airtableTableId: z.string().trim().min(1),
  createdAt: Entity.shape.createdAt,
  endDate: z.string().transform((value) => {
    return dayjs(value).tz('America/Los_Angeles').endOf('date').toDate();
  }),
  id: Entity.shape.id,
  name: z.string().trim().min(1),
  startDate: z.string().transform((value) => {
    return dayjs(value).tz('America/Los_Angeles').startOf('date').toDate();
  }),
});

// Use Case(s)

export const CreateResumeBookInput = ResumeBook.pick({
  airtableBaseId: true,
  airtableTableId: true,
  endDate: true,
  name: true,
  startDate: true,
}).extend({
  sponsors: z.string().trim().min(1).array().min(1),
});

export const SubmitResumeInput = Student.pick({
  firstName: true,
  lastName: true,
  linkedInUrl: true,
  hometown: true,
  hometownLatitude: true,
  hometownLongitude: true,
  race: true,
  workAuthorizationStatus: true,
}).extend({
  hometown: Student.shape.hometown.unwrap(),
  hometownLatitude: Student.shape.hometownLatitude.unwrap(),
  hometownLongitude: Student.shape.hometownLongitude.unwrap(),
  memberId: z.string().trim().min(1),
  resume: z.unknown().transform((value) => value as File),
  resumeBookId: z.string().trim().min(1),
});

export type CreateResumeBookInput = z.infer<typeof CreateResumeBookInput>;
export type SubmitResumeInput = z.infer<typeof SubmitResumeInput>;
