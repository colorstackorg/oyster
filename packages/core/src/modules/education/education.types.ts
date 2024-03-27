import { z } from 'zod';

import {
  Address,
  Entity,
  ExtractValue,
  ISO8601Date,
  Major,
  NullishString,
  Student,
} from '@colorstack/types';

// Enums

export const DegreeType = {
  ASSOCIATE: 'associate',
  BACHELORS: 'bachelors',
  CERTIFICATE: 'certificate',
  DOCTORAL: 'doctoral',
  MASTERS: 'masters',
  PROFESSIONAL: 'professional',
} as const;

export const FORMATTED_DEGREEE_TYPE: Record<DegreeType, string> = {
  associate: 'Associate',
  bachelors: "Bachelor's",
  certificate: 'Certificate',
  doctoral: 'Doctoral',
  masters: "Master's",
  professional: 'Professional',
};

export const EducationLevel = {
  BOOTCAMP: 'bootcamp',
  MASTERS: 'masters',
  OTHER: 'other',
  PHD: 'phd',
  UNDERGRADUATE: 'undergraduate',
} as const;

export const FORMATTED_EDUCATION_LEVEL: Record<EducationLevel, string> = {
  bootcamp: 'Bootcamp',
  masters: 'Masters',
  other: 'Other',
  phd: 'PhD',
  undergraduate: 'Undergraduate',
};

// Schemas

export const Education = Entity.extend({
  degreeType: z.nativeEnum(DegreeType),
  endDate: ISO8601Date,
  major: z.nativeEnum(Major),
  otherMajor: NullishString,
  otherSchool: NullishString,
  schoolId: NullishString.transform((value) => {
    return value === 'other' ? null : value;
  }),
  startDate: ISO8601Date,
  studentId: Student.shape.id,
});

export const School = Entity.extend({
  addressCity: Address.shape.city,
  addressState: Address.shape.state,
  addressZip: Address.shape.zip,
  name: z.string().min(1),
});

// Use Cases

export const AddEducationInput = Education.pick({
  degreeType: true,
  endDate: true,
  major: true,
  otherMajor: true,
  otherSchool: true,
  schoolId: true,
  startDate: true,
  studentId: true,
});

export const CreateSchoolInput = School.pick({
  addressCity: true,
  addressState: true,
  addressZip: true,
  name: true,
});

// Types

export type AddEducationInput = z.infer<typeof AddEducationInput>;
export type CreateSchoolInput = z.infer<typeof CreateSchoolInput>;
export type DegreeType = ExtractValue<typeof DegreeType>;
export type Education = z.infer<typeof Education>;
export type EducationLevel = ExtractValue<typeof EducationLevel>;
export type School = z.infer<typeof School>;
