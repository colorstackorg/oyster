import { Application, ApplicationStatus } from '@colorstack/types';
import { id } from '@colorstack/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

type ApplyInput = Pick<
  Application,
  | 'contribution'
  | 'educationLevel'
  | 'email'
  | 'firstName'
  | 'gender'
  | 'goals'
  | 'graduationYear'
  | 'lastName'
  | 'linkedInUrl'
  | 'major'
  | 'otherDemographics'
  | 'otherMajor'
  | 'otherSchool'
  | 'race'
  | 'schoolId'
>;

/**
 * Applies to join the ColorStack family. This also queues a job to send a
 * confirmation email to the applicant.
 */
export async function apply(input: ApplyInput) {
  const applicationId = id();

  await db
    .insertInto('applications')
    .values({
      contribution: input.contribution,
      educationLevel: input.educationLevel,
      email: input.email,
      firstName: input.firstName,
      gender: input.gender,
      goals: input.goals,
      graduationYear: input.graduationYear,
      id: applicationId,
      lastName: input.lastName,
      linkedInUrl: input.linkedInUrl!,
      major: input.major,
      otherDemographics: input.otherDemographics,
      otherMajor: input.otherMajor,
      otherSchool: input.otherSchool,
      race: input.race,
      schoolId: input.schoolId,
      status: ApplicationStatus.PENDING,
    })
    .execute();

  job('application.created', {
    applicationId,
  });
}
