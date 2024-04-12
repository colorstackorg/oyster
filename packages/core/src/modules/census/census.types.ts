import { z } from 'zod';

import { BooleanInput, Student } from '@oyster/types';

// Use Cases

const CensusRating = z.coerce.number().min(1).max(5);

export const SubmitCensusResponseInput = z.object({
  confidenceRatingFullTimeJob: CensusRating,
  confidenceRatingGraduating: CensusRating,
  confidenceRatingSchool: CensusRating,
  email: Student.shape.email,
  hasGraduated: BooleanInput,
  hasInternship: BooleanInput,
  hasTechnicalDegree: BooleanInput,
  isInternational: BooleanInput,
  memberId: Student.shape.id,
  summerLocation: z.string().trim().min(1),
  summerLocationLatitude: z.coerce.number(),
  summerLocationLongitude: z.coerce.number(),
});

export type SubmitCensusResponseInput = z.infer<
  typeof SubmitCensusResponseInput
>;
