import { z } from 'zod';

import {
  Entity,
  ExtractValue,
  ISO8601Date,
  NullishString,
  Student,
} from '@oyster/types';

// Enums

export const EmploymentType = {
  APPRENTICESHIP: 'apprenticeship',
  CONTRACT: 'contract',
  FREELANCE: 'freelance',
  FULL_TIME: 'full_time',
  INTERNSHIP: 'internship',
  PART_TIME: 'part_time',
} as const;

export const FORMATTED_EMPLOYMENT_TYPE: Record<EmploymentType, string> = {
  apprenticeship: 'Apprenticeship',
  contract: 'Contract',
  freelance: 'Freelance',
  full_time: 'Full-Time',
  internship: 'Internship',
  part_time: 'Part-Time',
};

export const JobOfferStatus = {
  ACCEPTED: 'accepted',
  RECEIVED: 'received',
  REJECTED: 'rejected',
} as const;

export const LocationType = {
  HYBRID: 'hybrid',
  IN_PERSON: 'in_person',
  REMOTE: 'remote',
} as const;

export const FORMATTED_LOCATION_TYPE: Record<LocationType, string> = {
  hybrid: 'Hybrid',
  in_person: 'In-Person',
  remote: 'Remote',
};

// Schemas (Base)

export const BaseCompany = z.object({
  crunchbaseId: z.string(),
  description: z.string().optional(),
  domain: z.string().optional(),
  imageUrl: z.string().url().optional(),
  name: z.string().min(1),
  stockSymbol: z.string().optional(),
});

export const Company = Entity.merge(BaseCompany);

export const JobOffer = Entity.omit({ deletedAt: true }).extend({
  baseSalary: z.number().optional(),
  bonus: z.number().optional(),
  companyId: Company.shape.id.nullish(),
  compensationType: z.string(),
  employmentType: z.nativeEnum(EmploymentType),
  hourlyPay: z.number().optional(),
  location: z.string().optional(),
  locationCoordinates: z.string().optional(),
  locationType: z.nativeEnum(LocationType),
  otherCompany: NullishString.optional(),
  startDate: ISO8601Date,
  status: z.string(),
  stockPerYear: z.number().optional(),
  studentId: Student.shape.id,
});

export const JobOfferFilters = z.object({
  status: z.string().optional(),
  companyId: Company.shape.id.nullish(),
  employmentType: z.nativeEnum(EmploymentType).nullish(),
  location: z.string().optional(),
});

export const WorkExperience = Entity.extend({
  companyId: Company.shape.id.nullish(),
  companyName: z.string().trim().min(1).nullish(),
  employmentType: z.nativeEnum(EmploymentType),
  endDate: ISO8601Date.nullish(),
  locationCity: NullishString,
  locationState: NullishString,
  locationType: z.nativeEnum(LocationType),
  startDate: ISO8601Date,
  studentId: Student.shape.id,
  title: z.string().trim().min(1),
});

// Schemas (Use Cases)

export const AddWorkExperienceInput = WorkExperience.pick({
  companyName: true,
  employmentType: true,
  endDate: true,
  locationCity: true,
  locationState: true,
  locationType: true,
  startDate: true,
  studentId: true,
  title: true,
}).extend({
  companyCrunchbaseId: Company.shape.crunchbaseId,
});

export const DeleteWorkExperienceInput = WorkExperience.pick({
  id: true,
  studentId: true,
});

export const EditWorkExperienceInput = AddWorkExperienceInput.extend({
  id: WorkExperience.shape.id,
});

export const UploadJobOfferInput = JobOffer.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

// Types

export type AddWorkExperienceInput = z.infer<typeof AddWorkExperienceInput>;
export type BaseCompany = z.infer<typeof BaseCompany>;
export type Company = z.infer<typeof Company>;
export type DeleteWorkExperienceInput = z.infer<
  typeof DeleteWorkExperienceInput
>;
export type EditWorkExperienceInput = z.infer<typeof EditWorkExperienceInput>;
export type EmploymentType = ExtractValue<typeof EmploymentType>;
export type JobOfferFilters = ExtractValue<typeof JobOfferFilters>;
export type LocationType = ExtractValue<typeof LocationType>;
export type UploadJobOfferInput = z.infer<typeof UploadJobOfferInput>;
export type WorkExperience = z.infer<typeof WorkExperience>;
