import { z } from 'zod';

import {
  Address,
  Demographic,
  EducationLevel,
  Email,
  Entity,
  Gender,
  Major,
  Race,
} from './types';
import { type ExtractValue } from '../shared/types';
import { NullishString } from '../shared/zod';

// Enums

export const ActivationRequirement = {
  ATTEND_EVENT: 'attend_event',
  ATTEND_ONBOARDING: 'attend_onboarding',
  OPEN_EMAIL_CAMPAIGN: 'open_email_campaign',
  REPLY_TO_ANNOUNCEMENT_MESSAGE: 'reply_to_announcement_message',
  REPLY_TO_OTHER_MESSAGES: 'reply_to_other_messages',
  SEND_INTRODUCTION_MESSAGE: 'send_introduction_message',
} as const;

export const MemberType = {
  ALUMNI: 'alumni',
  STUDENT: 'student',
} as const;

// Schemas

const StudentSocialLinks = z.object({
  calendlyUrl: z
    .string()
    .trim()
    .startsWith('http', 'URL must start with "http://".')
    .url()
    .transform((value) => value.toLowerCase())
    .refine((value) => value.includes('calendly.com'), {
      message: 'URL must be a valid Calendly URL.',
    })
    .nullable(),

  githubUrl: z
    .string()
    .trim()
    .startsWith('http', 'URL must start with "http://".')
    .url()
    .transform((value) => value.toLowerCase())
    .refine((value) => value.includes('github.com'), {
      message: 'URL must be a valid GitHub URL.',
    })
    .nullable(),

  instagramHandle: z
    .string()
    .trim()
    .min(2)
    .startsWith('@', 'Handle must start with an "@" character.')
    .transform((value) => value.toLowerCase())
    .nullable(),

  linkedInUrl: z
    .string()
    .trim()
    .startsWith('http', 'URL must start with "http://".')
    .url()
    .transform((value) => value.toLowerCase())
    .refine((value) => value.includes('linkedin.com/in/'), {
      message: 'URL must be a valid LinkedIn URL.',
    })
    .optional(),

  personalWebsiteUrl: z
    .string()
    .trim()
    .startsWith('http', 'URL must start with "http".')
    .url()
    .transform((value) => value.toLowerCase())
    .nullable(),

  twitterHandle: z
    .string()
    .trim()
    .min(2)
    .startsWith('@', 'Handle must start with an "@" character.')
    .transform((value) => value.toLowerCase())
    .nullable(),
});

const StudentLocation = z.object({
  currentLocation: z.string().trim().min(1).nullable(),
  currentLocationLatitude: z.coerce.number().nullable(),
  currentLocationLongitude: z.coerce.number().nullable(),
  hometown: z.string().trim().min(1).nullable(),
  hometownLatitude: z.coerce.number().nullable(),
  hometownLongitude: z.coerce.number().nullable(),
});

export const Student = Entity.merge(StudentSocialLinks)
  .merge(StudentLocation)
  .extend({
    acceptedAt: z.coerce.date(),
    activatedAt: z.coerce.date().optional(),
    activationRequirementsCompleted: z.array(
      z.nativeEnum(ActivationRequirement)
    ),
    address: Address.optional(),
    applicationId: z.string().optional(),
    appliedAt: z.coerce.date().optional(),
    claimedSwagPackAt: z.coerce.date().optional(),
    educationLevel: z.nativeEnum(EducationLevel),
    email: Email,
    firstName: z.string().trim().min(1),
    fullName: z.string().trim().min(2),
    gender: z.nativeEnum(Gender),
    genderPronouns: z.string().trim().min(1).nullable(),
    graduationYear: z.coerce.number(),
    headline: z.string().trim().min(1).nullable(),
    joinedAfterActivation: z.boolean(),
    joinedMemberDirectoryAt: z.coerce.date().nullable(),
    joinedSlackAt: z.coerce.date().optional(),
    lastName: z.string().trim().min(1),

    /**
     * Enum that represents all of the accepted majors from the ColorStack
     * official list.
     *
     * If the student doesn't have a major in this accepted list, then this
     * `major` value will be `null` and `otherMajor` should be populated with
     * a non-null value.
     */
    major: z.nativeEnum(Major),

    /**
     * This is an auto-incremented number that is used to easily identify a
     * member in the ColorStack system.
     */
    number: z.number().min(0),

    onboardedAt: z.coerce.date().optional(),
    otherDemographics: z
      .nativeEnum(Demographic)
      .array()
      .transform((demographics) => demographics.sort()),
    otherMajor: z.string().optional(),
    otherSchool: z.string().optional(),

    /**
     * The preferred name that a member would like to go by. This will typically
     * just be a first name.
     *
     * @example "Johnny"
     * @example "TJ"
     */
    preferredName: NullishString,

    /**
     * The URL to the profile picture of the student, which will likely come from
     * their Slack profile.
     *
     * @example "https://avatars.slack-edge.com/...jpg"
     */
    profilePicture: z.string().url().nullable(),

    race: z.nativeEnum(Race).array().min(1),

    /**
     * ID of the school record that the student is associated with.
     *
     * NOTE: If this value is not populated, then that means we couldn't find
     * the school ID reference.
     */
    schoolId: z
      .string()
      .min(1)
      .optional()
      .transform((value) => {
        return value === 'other' ? undefined : value;
      }),

    slackId: z.string().optional(),
    swagUpOrderId: z.string().min(1).optional(),
    type: z.nativeEnum(MemberType),
  });

export const StudentEmail = Entity.omit({
  id: true,
}).extend({
  email: Email,
  studentId: Student.shape.id.optional(),
});

export const StudentActiveStatus = z.object({
  date: z.string().trim().min(1),
  status: z.enum(['active', 'inactive']),
  studentId: Student.shape.id,
});

export const MemberEthnicity = z.object({
  countryCode: z.string().trim().length(3),
  studentId: Student.shape.id,
});

// Types

export type ActivationRequirement = ExtractValue<typeof ActivationRequirement>;
export type MemberEthnicity = z.infer<typeof MemberEthnicity>;
export type Student = z.infer<typeof Student>;
export type StudentActiveStatus = z.infer<typeof StudentActiveStatus>;
export type StudentEmail = z.infer<typeof StudentEmail>;
