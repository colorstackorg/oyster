import { db, point } from '@oyster/db';
import {
  getPresignedURL,
  putObject,
} from '@oyster/infrastructure/object-storage';

import { createAirtableRecord } from '@/modules/airtable/use-cases/create-airtable-record';
import { updateAirtableRecord } from '@/modules/airtable/use-cases/update-airtable-record';
import { getResumeBookSubmission } from '@/modules/resume-book/queries/get-resume-book-submission';
import { type SubmitResumeInput } from '@/modules/resume-book/resume-book.types';

export async function submitResume({
  codingLanguages,
  educationId,
  employmentSearchStatus,
  firstName,
  hometown,
  hometownLatitude,
  hometownLongitude,
  lastName,
  linkedInUrl,
  memberId,
  preferredCompany1,
  preferredCompany2,
  preferredCompany3,
  preferredRoles,
  race,
  resume,
  resumeBookId,
  workAuthorizationStatus,
}: SubmitResumeInput) {
  const [submission, resumeBook, member, education] = await Promise.all([
    getResumeBookSubmission({
      select: ['airtableRecordId'],
      where: { memberId, resumeBookId },
    }),

    db
      .selectFrom('resumeBooks')
      .select(['airtableBaseId', 'airtableTableId'])
      .where('id', '=', resumeBookId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('students as members')
      .select(['email', 'graduationYear'])
      .where('id', '=', memberId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('educations')
      .leftJoin('schools', 'schools.id', 'educations.schoolId')
      .select([
        'educations.degreeType',
        'educations.endDate',
        'schools.addressCity',
        'schools.addressState',
        'schools.addressZip',
      ])
      .where('id', '=', educationId)
      .executeTakeFirstOrThrow(),
  ]);

  const arrayBuffer = await resume.arrayBuffer();

  const attachmentKey = `resume-books/${resumeBookId}/${memberId}`;

  await putObject({
    content: Buffer.from(arrayBuffer),
    contentType: resume.type,
    key: attachmentKey,
  });

  const resumeLink = await getPresignedURL({
    key: attachmentKey,
  });

  // In order to keep the resume file names consistent for the partners, we'll
  // use the same naming convention based on the submitter.
  const filename = `${lastName}_${firstName}_${member.graduationYear}.pdf`;

  const graduationYear = education.endDate.getFullYear();

  const graduationSeason =
    education.endDate.getMonth() <= 6 ? 'Spring' : 'Fall';

  const airtableRecordId = !submission
    ? await createAirtableRecord({
        baseId: resumeBook.airtableBaseId,
        data: {
          'First Name': firstName,
          'Last Name': lastName,
          Email: member.email,
          Race: race,
          'Current Education Level': education.degreeType,
          'Graduation Year': graduationYear,
          'Graduation Season': graduationSeason,
          'University Location (Short)': education.addressState,
          'University Location (Full)': `${education.addressCity}, ${education.addressState} ${education.addressZip}`,
          Hometown: hometown,
          'Role Interest': [],
          'Proficient Language(s)': [],
          'Employment Search Status': '',
          'Sponsor Interest #1': '',
          'Sponsor Interest #2': '',
          'Sponsor Interest #3': '',
          Resume: [{ filename, url: resumeLink }],
          LinkedIn: linkedInUrl,
          'Are you authorized to work in the US or Canada?':
            workAuthorizationStatus,
        },
        tableName: resumeBook.airtableTableId,
      })
    : await updateAirtableRecord({
        airtableId: submission.airtableRecordId,
        data: {},
      });

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('students')
      .set({
        firstName,
        hometown,
        hometownCoordinates: point({
          x: hometownLongitude,
          y: hometownLatitude,
        }),
        lastName,
        linkedInUrl,
        race,
        workAuthorizationStatus,
      })
      .where('id', '=', memberId)
      .execute();

    await trx
      .insertInto('resumeBookSubmissions')
      .values({
        airtableRecordId: airtableRecordId as string,
        codingLanguages,
        educationId,
        employmentSearchStatus,
        memberId,
        preferredCompany1,
        preferredCompany2,
        preferredCompany3,
        preferredRoles,
        resumeBookId,
        submittedAt: new Date(),
      })
      .onConflict((oc) => {
        return oc.columns(['memberId', 'resumeBookId']).doUpdateSet((eb) => {
          return {
            codingLanguages: eb.ref('excluded.codingLanguages'),
            educationId: eb.ref('excluded.educationId'),
            employmentSearchStatus: eb.ref('excluded.employmentSearchStatus'),
            preferredCompany1: eb.ref('excluded.preferredCompany1'),
            preferredCompany2: eb.ref('excluded.preferredCompany2'),
            preferredCompany3: eb.ref('excluded.preferredCompany3'),
            preferredRoles: eb.ref('excluded.preferredRoles'),
            submittedAt: eb.ref('excluded.submittedAt'),
          };
        });
      })
      .execute();
  });
}
