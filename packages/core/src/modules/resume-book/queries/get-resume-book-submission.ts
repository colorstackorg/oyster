import { type SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';

type GetResumeBookSubmissionOptions<Selection> = {
  select?: Selection[];
  where: {
    memberId: string;
    resumeBookId: string;
  };
};

export async function getResumeBookSubmission<
  Selection extends SelectExpression<DB, 'resumeBookSubmissions'>,
>({ select = [], where }: GetResumeBookSubmissionOptions<Selection>) {
  const submission = await db
    .selectFrom('resumeBookSubmissions')
    .select(select)
    .where('memberId', '=', where.memberId)
    .where('resumeBookId', '=', where.resumeBookId)
    .executeTakeFirst();

  return submission;
}
