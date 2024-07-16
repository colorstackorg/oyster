import { db } from '@oyster/db';

type GetResumeBookSubmissionOptions = {
  where: {
    memberId: string;
    resumeBookId: string;
  };
};

export async function getResumeBookSubmission({
  where,
}: GetResumeBookSubmissionOptions) {
  const submission = await db
    .selectFrom('resumeBookSubmissions')
    .select([])
    .where('memberId', '=', where.memberId)
    .where('resumeBookId', '=', where.resumeBookId)
    .executeTakeFirst();

  return submission;
}
