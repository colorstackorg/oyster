import { type SelectExpression } from 'kysely';

import { type DB } from '@oyster/db';

import { db } from '@/infrastructure/database';

type GetCensusResponseOptions<Selection> = {
  select: Selection[];
  where: Pick<DB['censusResponses'], 'studentId' | 'year'>;
};

export async function getCensusResponse<
  Selection extends SelectExpression<DB, 'censusResponses'>,
>(options: GetCensusResponseOptions<Selection>) {
  const { select, where } = options;

  const response = await db
    .selectFrom('censusResponses')
    .select(select)
    .where('studentId', '=', where.studentId)
    .where('year', '=', where.year)
    .executeTakeFirst();

  return response;
}
