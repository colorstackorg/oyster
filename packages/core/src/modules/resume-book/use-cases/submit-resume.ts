import { db, point } from '@oyster/db';
import {
  getPresignedURL,
  putObject,
} from '@oyster/infrastructure/object-storage';

import { createAirtableRecord } from '@/modules/airtable/use-cases/create-airtable-record';
import { type SubmitResumeInput } from '@/modules/resume-book/resume-book.types';

export async function submitResume({
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
  const resumeBook = await db
    .selectFrom('resumeBooks')
    .select(['airtableBaseId', 'airtableTableId'])
    .where('id', '=', resumeBookId)
    .executeTakeFirstOrThrow();

  const member = await db
    .selectFrom('students as members')
    .select(['graduationYear'])
    .where('id', '=', memberId)
    .executeTakeFirstOrThrow();

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

  const airtableRecordId = await createAirtableRecord({
    baseId: resumeBook.airtableBaseId,
    data: {
      Resume: [{ filename, url: resumeLink }],
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
