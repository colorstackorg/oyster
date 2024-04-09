import { z } from 'zod';

import { Entity, ISO8601Date } from '@oyster/types';

//Enums

export const PositionLevel = {
  FULL_TIME: 'full_time',
  INTERNSHIP: 'internship',
  PART_TIME: 'part_time',
} as const;

export const InterviewStatus = {
  OFFERED: 'offered',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;

// Schemas (Base)

export const InterviewExperience = Entity.omit({ deletedAt: true }).extend({
  studentID: z.string(),
  positionName: z.string(),
  positionLevel: z.nativeEnum(PositionLevel),
  startDate: ISO8601Date,
  endDate: ISO8601Date,
  companyId: z.string().nullish(),
  numberOfRounds: z.number(),
  interviewQuestions: z.string(),
  interviewReview: z.string().optional(),
  extraNotes: z.string().optional(),
  interviewStatus: z.nativeEnum(InterviewStatus),
});

// Schemas (Use Cases)

export const AddInterviewExperienceInput = InterviewExperience.pick({
  studentID: true,
  positionName: true,
  positionLevel: true,
  startDate: true,
  endDate: true,
  companyId: true,
  numberOfRounds: true,
  interviewQuestions: true,
  interviewReview: true,
  extraNotes: true,
  interviewStatus: true,
});

//Types
export type AddInterviewExperienceInput = z.infer<
  typeof AddInterviewExperienceInput
>;
