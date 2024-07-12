import { db } from '@oyster/db';
import {
  getPresignedURL,
  putObject,
} from '@oyster/infrastructure/object-storage';
import { id } from '@oyster/utils';

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

  // ID of the resume book submission. Will be used for the Cloudflare storage
  // as well as the database record itself.
  const submissionId = id();

  const attachmentKey = `resume-books/${resumeBookId}/${submissionId}`;

  await putObject({
    content: Buffer.from(arrayBuffer),
    contentType: resume.type,
    key: attachmentKey,
  });

  const resumeLink = await getPresignedURL({
    key: attachmentKey,
  });

  const airtableRecordId = await createAirtableRecord({
    baseId: resumeBook.airtableBaseId,
    data: {
      Resume: [
        {
          filename: `${member.lastName}_${member.firstName}_${member.graduationYear}.pdf`,
          url: resumeLink,
        },
      ],
    },
    tableName: resumeBook.airtableTableId,
  });
}
