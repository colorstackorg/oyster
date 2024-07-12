import { db } from '@oyster/db';
import {
  getPresignedURL,
  putObject,
} from '@oyster/infrastructure/object-storage';

import { createAirtableRecord } from '@/modules/airtable/use-cases/create-airtable-record';
import { type SubmitResumeInput } from '@/modules/resume-book/resume-book.types';

export async function submitResume({
  memberId,
  resume,
  resumeBookId,
}: SubmitResumeInput) {
  const resumeBook = await db
    .selectFrom('resumeBooks')
    .select(['airtableBaseId', 'airtableTableId'])
    .where('id', '=', resumeBookId)
    .executeTakeFirstOrThrow();

  const member = await db
    .selectFrom('students as members')
    .select(['firstName', 'lastName', 'graduationYear'])
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
  const filename = `${member.lastName}_${member.firstName}_${member.graduationYear}.pdf`;

  const airtableRecordId = await createAirtableRecord({
    baseId: resumeBook.airtableBaseId,
    data: {
      Resume: [{ filename, url: resumeLink }],
    },
    tableName: resumeBook.airtableTableId,
  });

  await db
    .insertInto('resumeBookSubmissions')
    .values({
      airtableRecordId: airtableRecordId as string,
      memberId,
      resumeBookId,
      submittedAt: new Date(),
    })
    .execute();
}
