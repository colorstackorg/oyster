import { z } from 'zod';

import { BooleanInput, multiSelectField } from '@oyster/types';

// Use Cases

const CensusRating = z.coerce.number().min(1).max(5);

export const BaseCensusResponse = z.object({
  additionalOffers: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  currentResources: multiSelectField(z.string().trim()),
  hasGraduated: BooleanInput,
  hasRoleThroughColorStack: BooleanInput,
  summerLocation: z.string().trim(),
  summerLocationLatitude: z.coerce.number(),
  summerLocationLongitude: z.coerce.number(),
});

export const AlumniCensusResponse = BaseCensusResponse.extend({
  alumniProgramming: z.string().trim(),
  confidenceRatingFullTimePreparedness: CensusRating,
  joinAlumni: BooleanInput,
  hasGraduated: z.preprocess((value) => value === '1', z.literal(true)),
  hasTechnicalDegree: BooleanInput,
  hasTechnicalRole: BooleanInput,
});

export const UndergraduateCensusResponse = BaseCensusResponse.extend({
  communityNeeds: z.string().trim(),
  confidenceRatingFullTimeJob: CensusRating,
  confidenceRatingGraduating: CensusRating,
  confidenceRatingInterviewing: CensusRating,
  confidenceRatingSchool: CensusRating,
  futureResources: z.string().trim(),
  hasGraduated: z.preprocess((value) => value === '1', z.literal(false)),
  hasInternship: BooleanInput,
  internationalSupport: z.string().trim().optional(),
  isInternational: BooleanInput,
  isOnTrackToGraduate: BooleanInput,
});

export const SubmitCensusResponseData = z.discriminatedUnion('hasGraduated', [
  AlumniCensusResponse,
  UndergraduateCensusResponse,
]);

export type SubmitCensusResponseData = z.infer<typeof SubmitCensusResponseData>;
