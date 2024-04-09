import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { type AddInterviewExperienceInput } from '../interview-experiences.types';

export async function uploadInterviewExperience(
  input: AddInterviewExperienceInput
) {
  const interviewId = id();

  await db
    .insertInto('interviewExperiences')
    .values({
      id: interviewId,
      positionName: input.positionName,
      positionLevel: input.positionLevel,
      startDate: input.startDate,
      studentId: input.studentID,
      endDate: input.endDate,
      companyId: input.companyId,
      numberOfRounds: input.numberOfRounds,
      interviewQuestions: input.interviewQuestions,
      interviewReview: input.interviewReview,
      extraNotes: input.extraNotes,
      interviewStatus: input.interviewStatus,
    })
    .execute();
}
