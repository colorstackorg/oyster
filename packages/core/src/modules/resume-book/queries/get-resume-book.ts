import { type SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';

type GetResumeBookOptions<Selection> = {
  select: Selection[];
  where: { id: string };
};

export async function getResumeBook<
  Selection extends SelectExpression<DB, 'resumeBooks'>,
>({ select, where }: GetResumeBookOptions<Selection>) {
  const resumeBook = await db
    .selectFrom('resumeBooks')
    .select(select)
    .where('id', '=', where.id)
    .executeTakeFirst();

  return resumeBook;
}
