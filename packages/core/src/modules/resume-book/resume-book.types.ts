import { NodeOnDiskFile } from '@remix-run/node';
import dayjs from 'dayjs';
import { z } from 'zod';

import { BooleanInput, Entity, Student } from '@oyster/types';

export const RESUME_BOOK_CODING_LANGUAGES = [
  'C',
  'C++',
  'C#',
  'Go',
  'Java',
  'JavaScript',
  'Kotlin',
  'Matlab',
  'Objective-C',
  'PHP',
  'Python',
  'Ruby',
  'Rust',
  'Scala',
  'Solidity',
  'SQL',
  'Swift',
  'TypeScript',
];

export const RESUME_BOOK_JOB_SEARCH_STATUSES = [
  'I am actively searching for a position.',
  'I have accepted an offer.',
  'I am between offers, but still searching.',
];

export const RESUME_BOOK_ROLES = [
  'Software Engineering',
  'Data Science',
  'Web Development',
  'AI/Machine Learning',
  'iOS Developer',
  'Android Developer',
  'Product Management',
  'Product Design (UI/UX)',
  'Developer Advocacy',
  'Network Architecture',
  'Cybersecurity Engineer/Analyst',
];

export const RESUME_BOOK_TIMEZONE = 'America/Los_Angeles';

// Domain

export const ResumeBook = z.object({
  airtableBaseId: z.string().trim().min(1),
  airtableTableId: z.string().trim().min(1),
  createdAt: Entity.shape.createdAt,
  endDate: z.string().transform((value) => {
    return dayjs(value).tz(RESUME_BOOK_TIMEZONE, true).endOf('date').toDate();
  }),
  hidden: BooleanInput,
  id: Entity.shape.id,
  name: z.string().trim().min(1),
  startDate: z.string().transform((value) => {
    return dayjs(value).tz(RESUME_BOOK_TIMEZONE, true).startOf('date').toDate();
  }),
});

// Use Case(s)

export const CreateResumeBookInput = ResumeBook.pick({
  endDate: true,
  hidden: true,
  name: true,
  startDate: true,
}).extend({
  sponsors: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(',')),
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
})
  .required({ workAuthorizationStatus: true })
  .extend({
    codingLanguages: z.array(z.string().trim().min(1)).min(1),
    educationId: z.string().trim().min(1),
    employmentSearchStatus: z.string().trim().min(1),
    hometown: Student.shape.hometown.unwrap(),
    hometownLatitude: Student.shape.hometownLatitude.unwrap(),
    hometownLongitude: Student.shape.hometownLongitude.unwrap(),
    memberId: z.string().trim().min(1),
    preferredCompany1: z.string().trim().min(1),
    preferredCompany2: z.string().trim().min(1),
    preferredCompany3: z.string().trim().min(1),
    preferredRoles: z.array(z.string().trim().min(1)).min(1),
    resume: z.union([
      z.string().trim().min(1),
      z.instanceof(NodeOnDiskFile).transform((value) => value as File),
    ]),
    resumeBookId: z.string().trim().min(1),
  });

export const UpdateResumeBookInput = ResumeBook.pick({
  endDate: true,
  hidden: true,
  id: true,
  name: true,
  startDate: true,
});

export type CreateResumeBookInput = z.infer<typeof CreateResumeBookInput>;
export type SubmitResumeInput = z.infer<typeof SubmitResumeInput>;
export type UpdateResumeBookInput = z.infer<typeof UpdateResumeBookInput>;
