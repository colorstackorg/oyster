import { db, point } from '@oyster/db';
import {
  getPresignedURL,
  putObject,
} from '@oyster/infrastructure/object-storage';

import { createAirtableRecord } from '@/modules/airtable/use-cases/create-airtable-record';
import { type SubmitResumeInput } from '@/modules/resume-book/resume-book.types';

export async function submitResume({
  educationId,
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
  race,
  resume,
  resumeBookId,
  workAuthorizationStatus,
}: SubmitResumeInput) {
  const [resumeBook, member, education] = await Promise.all([
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

  const airtableRecordId = await createAirtableRecord({
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
        educationId,
        memberId,
        preferredCompany1,
        preferredCompany2,
        preferredCompany3,
        resumeBookId,
        submittedAt: new Date(),
      })
      .execute();
  });
}
