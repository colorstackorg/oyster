import { ApplicationStatus, OtherDemographic } from '@oyster/types';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function acceptApplication(
  applicationId: string,
  adminId: string
) {
  const application = await db
    .selectFrom('applications')
    .select([
      'applications.createdAt',
      'applications.educationLevel',
      'applications.email',
      'applications.firstName',
      'applications.gender',
      'applications.graduationYear',
      'applications.id',
      'applications.lastName',
      'applications.linkedInUrl',
      'applications.major',
      'applications.otherDemographics',
      'applications.otherMajor',
      'applications.otherSchool',
      'applications.race',
      'applications.schoolId',
    ])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  let studentId = '';

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('applications')
      .set({
        acceptedAt: new Date(),
        reviewedById: adminId,
        status: ApplicationStatus.ACCEPTED,
      })
      .where('id', '=', applicationId)
      .execute();

    // Some applicants apply multiple times to ColorStack (typically it's an
    // accident) and historically we would _try_ to accept all of their,
    // applications but we can't have multiple members with the same email
    // so it would cause issues. We'll scrap any other pending applications
    // from the same email address.
    await trx
      .deleteFrom('applications')
      .where('email', '=', application.email)
      .where('id', '!=', application.id)
      .where('status', '=', ApplicationStatus.PENDING)
      .execute();

    await trx
      .insertInto('studentEmails')
      .values({ email: application.email })
      .execute();

    const allOtherDemographics = Object.values(OtherDemographic) as string[];

    const otherDemographics = application.otherDemographics.filter(
      (demographic) => {
        return !allOtherDemographics.includes(demographic);
      }
    );

    studentId = id();

    await trx
      .insertInto('students')
      .values({
        acceptedAt: new Date(),
        applicationId: application.id,
        appliedAt: application.createdAt,
        educationLevel: application.educationLevel,
        email: application.email,
        firstName: application.firstName,
        gender: application.gender,
        graduationYear: application.graduationYear.toString(),
        id: studentId,
        lastName: application.lastName,
        linkedInUrl: application.linkedInUrl,
        major: application.major,
        otherDemographics,
        otherMajor: application.otherMajor,
        otherSchool: application.otherSchool,
        race: application.race,
        schoolId: application.schoolId,
      })
      .execute();

    await trx
      .updateTable('studentEmails')
      .set({ studentId })
      .where('email', '=', application.email)
      .execute();
  });

  job('application.accepted', {
    applicationId,
    studentId,
  });
}
