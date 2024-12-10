import { z } from 'zod';

import { Application, Email, Student } from '@oyster/types';

const BaseEmail = z.object({
  to: Email,
});

export const EmailTemplate = z.discriminatedUnion('name', [
  BaseEmail.extend({
    name: z.literal('application-accepted'),
    data: Application.pick({ firstName: true }),
  }),
  BaseEmail.extend({
    name: z.literal('application-created'),
    data: Application.pick({ firstName: true }),
  }),
  BaseEmail.extend({
    name: z.literal('application-rejected'),
    data: z.object({
      firstName: z.string(),
      reason: z.string(),
    }),
  }),
  BaseEmail.extend({
    name: z.literal('one-time-code-sent'),
    data: z.object({
      code: z.string().trim().length(6),
      firstName: z.string(),
    }),
  }),
  BaseEmail.extend({
    name: z.literal('primary-email-changed'),
    data: z.object({
      firstName: Student.shape.firstName,
      newEmail: Student.shape.email,
      previousEmail: Student.shape.email,
    }),
  }),
  BaseEmail.extend({
    name: z.literal('referral-accepted'),
    data: z.object({
      firstName: z.string().trim().min(1),
      referralsUri: z.string().url(),
      referredFirstName: z.string().trim().min(1),
      referredLastName: z.string().trim().min(1),
    }),
  }),
  BaseEmail.extend({
    name: z.literal('referral-sent'),
    data: z.object({
      applicationUri: z.string().url(),
      firstName: z.string().trim().min(1),
      referrerFirstName: z.string().trim().min(1),
      referrerLastName: z.string().trim().min(1),
    }),
  }),
  BaseEmail.extend({
    name: z.literal('resume-submitted'),
    data: z.object({
      edited: z.boolean(),
      firstName: Student.shape.firstName,
      resumeBookName: z.string().trim().min(1),
      resumeBookUri: z.string().url(),
    }),
  }),
  BaseEmail.extend({
    name: z.literal('student-anniversary'),
    data: z.object({
      firstName: z.string().trim().min(1),
      years: z.number().int().positive(), // Years in ColorStack
    }),
  }),
  BaseEmail.extend({
    name: z.literal('student-attended-onboarding'),
    data: z.object({
      firstName: Student.shape.firstName,
      studentsInSession: z.array(
        z.object({
          fullName: Student.shape.fullName,
          graduationYear: Student.shape.graduationYear,
          id: Student.shape.id,
          linkedInUrl: Student.shape.linkedInUrl,
          school: z.string(),
        })
      ),
    }),
  }),
  BaseEmail.extend({
    name: z.literal('student-removed'),
    data: z.object({
      firstName: z.string().trim().min(1),
    }),
  }),
]);

// Types

export type EmailTemplate = z.infer<typeof EmailTemplate>;

export type EmailTemplateData<Name extends EmailTemplate['name']> = Extract<
  EmailTemplate,
  { name: Name }
>['data'];
