import { z } from 'zod';

import { BooleanInput, checkboxField, Student } from '@oyster/types';

// Use Cases

const CensusRating = z.coerce.number().min(1).max(5);

export const SubmitCensusResponseInput = z.object({
  alumniProgramming: z.string().trim(),
  communityNeeds: z.string().trim(),
  confidenceRatingFullTimeJob: CensusRating,
  confidenceRatingFullTimePreparedness: CensusRating,
  confidenceRatingGraduating: CensusRating,
  confidenceRatingInterviewing: CensusRating,
  confidenceRatingSchool: CensusRating,
  currentResources: checkboxField(z.string().trim()),
  email: Student.shape.email,
  futureResources: z.string().trim(),
  joinAlumni: BooleanInput,
  hasGraduated: BooleanInput,
  hasInternship: BooleanInput,
  hasPartnerRole: BooleanInput,
  hasTechnicalDegree: BooleanInput,
  hasTechnicalRole: BooleanInput,
  isInternational: BooleanInput,
  memberId: Student.shape.id,
  schoolId: Student.shape.schoolId,
  schoolName: z.string().trim(),
  summerLocation: z.string().trim(),
  summerLocationLatitude: z.coerce.number(),
  summerLocationLongitude: z.coerce.number(),
});

export type SubmitCensusResponseInput = z.infer<
  typeof SubmitCensusResponseInput
>;
