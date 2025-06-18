import { z } from 'zod';

import {
  BooleanInput,
  Entity,
  type ExtractValue,
  ISO8601Date,
  nullableField,
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
  anonymous: BooleanInput,
  rating: z.coerce.number().int().min(0).max(10),
  recommend: BooleanInput,
  studentId: Student.shape.id,
  text: z.string().trim().min(750),
  workExperienceId: z.string().trim().min(1),
});

export const WorkExperience = Entity.extend({
  companyId: NullishString,
  companyName: NullishString,
  employmentType: z.nativeEnum(EmploymentType),
  endDate: ISO8601Date.nullish(),
  locationCity: NullishString,
  locationState: NullishString,
  locationType: nullableField(z.nativeEnum(LocationType).nullable()),
  startDate: ISO8601Date,
  studentId: Student.shape.id,
  title: z.string().trim().min(1),
});

export type WorkExperience = z.infer<typeof WorkExperience>;

// Queries

export const GetCompanyWhere = z.object({
  id: Company.shape.id,
});

export const ListCompanyReviewsWhere = z
  .object({
    companyId: Company.shape.id,
    postedAfter: z.date(),
    postedBefore: z.date(),
  })
  .partial();

export const ListCompaniesOrderBy = z
  .enum([
    'highest_rated',
    'most_employees',
    'most_recently_reviewed',
    'most_reviews',
  ])
  .catch('most_employees');

export const ListCompaniesWhere = z.object({
  search: ListSearchParams.shape.search,
});

export type GetCompanyWhere = z.infer<typeof GetCompanyWhere>;
export type ListCompaniesOrderBy = z.infer<typeof ListCompaniesOrderBy>;
export type ListCompaniesWhere = z.infer<typeof ListCompaniesWhere>;
export type ListCompanyReviewsWhere = z.infer<typeof ListCompanyReviewsWhere>;

// Use Case(s)

export const AddCompanyReviewInput = CompanyReview;

export const AddWorkExperienceInput = WorkExperience.pick({
  companyId: true,
  companyName: true,
  employmentType: true,
  locationCity: true,
  locationState: true,
  locationType: true,
  studentId: true,
  title: true,
}).extend({
  endDate: WorkExperience.shape.endDate.refine((value) => {
    return !value || new Date(value).getFullYear() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),

  id: nullableField(WorkExperience.shape.id.nullable()),

  startDate: WorkExperience.shape.startDate.refine((value) => {
    return new Date(value).getFullYear() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),
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

export const UpvoteCompanyReviewInput = z.object({
  memberId: z.string().trim().min(1),
});

export type AddCompanyReviewInput = z.infer<typeof AddCompanyReviewInput>;
export type AddWorkExperienceInput = z.infer<typeof AddWorkExperienceInput>;
export type DeleteWorkExperienceInput = z.infer<
  typeof DeleteWorkExperienceInput
>;
export type EditCompanyReviewInput = z.infer<typeof EditCompanyReviewInput>;
export type EditWorkExperienceInput = z.infer<typeof EditWorkExperienceInput>;
export type UpvoteCompanyReviewInput = z.infer<typeof UpvoteCompanyReviewInput>;
