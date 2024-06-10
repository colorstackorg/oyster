import { z } from 'zod';

import {
  BooleanInput,
  Entity,
  type ExtractValue,
  ISO8601Date,
  NullishString,
  Student,
} from '@oyster/types';

import { ListSearchParams } from '@/shared/types';

// Enums

export const EmploymentType = {
  APPRENTICESHIP: 'apprenticeship',
  CONTRACT: 'contract',
  FREELANCE: 'freelance',
  FULL_TIME: 'full_time',
  INTERNSHIP: 'internship',
  PART_TIME: 'part_time',
} as const;

export type EmploymentType = ExtractValue<typeof EmploymentType>;

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

export type LocationType = ExtractValue<typeof LocationType>;

export const FORMATTED_LOCATION_TYPE: Record<LocationType, string> = {
  hybrid: 'Hybrid',
  in_person: 'In-Person',
  remote: 'Remote',
};

// Domain

export const BaseCompany = z.object({
  crunchbaseId: z.string(),
  description: z.string().optional(),
  domain: z.string().optional(),
  imageUrl: z.string().url().optional(),
  name: z.string().min(1),
  stockSymbol: z.string().optional(),
});

export type BaseCompany = z.infer<typeof BaseCompany>;

export const Company = Entity.merge(BaseCompany);

export type Company = z.infer<typeof Company>;

const CompanyReview = z.object({
  rating: z.coerce.number().int().min(0).max(10),
  recommend: BooleanInput,
  studentId: Student.shape.id,
  text: z.string().trim().min(1000),
  workExperienceId: z.string().trim().min(1),
});

export const JobOffer = Entity.omit({ deletedAt: true }).extend({
  baseSalary: z.number().optional(),
  bonus: z.number().optional(),
  companyId: Company.shape.id.nullish(),
  compensationType: z.string(),
  employmentType: z.nativeEnum(EmploymentType),
  hourlyPay: z.number().optional(),
  location: z.string().optional(),
  locationLatitude: z.number().optional(),
  locationLongitude: z.number().optional(),
  locationType: z.nativeEnum(LocationType),
  otherCompany: NullishString.optional(),
  startDate: ISO8601Date,
  status: z.nativeEnum(JobOfferStatus),
  stockPerYear: z.number().optional(),
  studentId: Student.shape.id,
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

export type WorkExperience = z.infer<typeof WorkExperience>;

// Queries

export const GetCompanyWhere = z.object({
  id: Company.shape.id,
});

export const ListCompanyReviewsWhere = z.object({
  companyId: Company.shape.id,
});

export const ListCompaniesOrderBy = z
  .enum([
    'most_employees',
    'most_recently_reviewed',
    'most_reviews',
    'highest_rated',
  ])
  .catch('most_employees');

export const ListCompaniesWhere = z.object({
  search: ListSearchParams.shape.search,
});

export const ListJobOffersWhere = z.object({
  company: Company.shape.id.nullable().catch(null),
  employmentType: JobOffer.shape.employmentType.nullable().catch(null),
  locationLatitude: JobOffer.shape.locationLatitude,
  locationLongitude: JobOffer.shape.locationLongitude,
  status: JobOffer.shape.status.nullable().catch(null),
});

export type GetCompanyWhere = z.infer<typeof GetCompanyWhere>;
export type ListCompaniesOrderBy = z.infer<typeof ListCompaniesOrderBy>;
export type ListCompaniesWhere = z.infer<typeof ListCompaniesWhere>;
export type ListCompanyReviewsWhere = z.infer<typeof ListCompanyReviewsWhere>;
export type ListJobOffersWhere = z.infer<typeof ListJobOffersWhere>;

// Use Case(s)

export const AddCompanyReviewInput = CompanyReview;

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

export const EditCompanyReviewInput = AddCompanyReviewInput.omit({
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

export type AddCompanyReviewInput = z.infer<typeof AddCompanyReviewInput>;
export type AddWorkExperienceInput = z.infer<typeof AddWorkExperienceInput>;
export type DeleteWorkExperienceInput = z.infer<
  typeof DeleteWorkExperienceInput
>;
export type EditCompanyReviewInput = z.infer<typeof EditCompanyReviewInput>;
export type EditWorkExperienceInput = z.infer<typeof EditWorkExperienceInput>;
export type UploadJobOfferInput = z.infer<typeof UploadJobOfferInput>;
