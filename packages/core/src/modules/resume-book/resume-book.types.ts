import dayjs from 'dayjs';
import { z } from 'zod';

import { Entity } from '@oyster/types';

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
});

export type CreateResumeBookInput = z.infer<typeof CreateResumeBookInput>;
