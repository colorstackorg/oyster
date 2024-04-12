import { z } from 'zod';

import { BooleanInput, checkboxField, Student } from '@oyster/types';

// Use Cases

const CensusRating = z.coerce.number().min(1).max(5);

export const SubmitCensusResponseInput = z.object({
  alumniProgramming: z.string().trim().min(1),
  communityNeeds: z.string().trim().min(1),
  confidenceRatingFullTimeJob: CensusRating,
  confidenceRatingFullTimePreparedness: CensusRating,
  confidenceRatingGraduating: CensusRating,
  confidenceRatingInterviewing: CensusRating,
  confidenceRatingSchool: CensusRating,
  currentResources: checkboxField(z.string().trim().min(1)),
  email: Student.shape.email,
  futureResources: z.string().trim().min(1),
  joinAlumni: BooleanInput,
  hasGraduated: BooleanInput,
  hasInternship: BooleanInput,
  hasPartnerRole: BooleanInput,
  hasTechnicalDegree: BooleanInput,
  hasTechnicalRole: BooleanInput,
  isInternational: BooleanInput,
  memberId: Student.shape.id,
  summerLocation: z.string().trim().min(1),
  summerLocationLatitude: z.coerce.number(),
  summerLocationLongitude: z.coerce.number(),
});

export type SubmitCensusResponseInput = z.infer<
  typeof SubmitCensusResponseInput
>;
