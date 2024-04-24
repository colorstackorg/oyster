import { z } from 'zod';

import { Student } from '@oyster/types';

import { Company } from '@/modules/employment/employment.types';
import { Country } from '@/modules/location/location.types';
import { ListSearchParams } from '@/shared/types';

// Queries

export const ListMembersInDirectoryWhere = ListSearchParams.pick({
  search: true,
}).extend({
  company: Company.shape.id.nullable().catch(null),
  ethnicity: Country.shape.code.nullable().catch(null),
  graduationYear: Student.shape.graduationYear.nullable().catch(null),
  hometown: z.string().trim().min(1).nullable().catch(null),
  hometownLatitude: z.coerce.number().nullable().catch(null),
  hometownLongitude: z.coerce.number().nullable().catch(null),
  location: z.string().trim().min(1).nullable().catch(null),
  locationLatitude: z.coerce.number().nullable().catch(null),
  locationLongitude: z.coerce.number().nullable().catch(null),
  school: z.string().min(1).nullable().catch(null),
});

export type ListMembersInDirectoryWhere = z.infer<
  typeof ListMembersInDirectoryWhere
>;

// Use Cases

export const ChangePrimaryEmailInput = Student.pick({
  email: true,
});

export type ChangePrimaryEmailInput = z.infer<typeof ChangePrimaryEmailInput>;

export const LinkGithubAccountInput = Student.pick({
  githubId: true,
  githubUrl: true,
}).required();

export type LinkGithubAccountInput = z.infer<typeof LinkGithubAccountInput>;
