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
    data: Application.pick({ firstName: true }),
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
    name: z.literal('student-activated'),
    data: z.object({
      firstName: Student.shape.firstName,
      studentProfileUrl: z.string().url(),
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
    data: z.object({}),
  }),
]);

// Types

export type EmailTemplate = z.infer<typeof EmailTemplate>;

export type EmailTemplateData<Name extends EmailTemplate['name']> = Extract<
  EmailTemplate,
  { name: Name }
>['data'];
