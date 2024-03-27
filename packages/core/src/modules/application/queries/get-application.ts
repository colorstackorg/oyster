import type { SelectExpression } from 'kysely';
import type { DB } from 'kysely-codegen/dist/db';

import { db } from '@/infrastructure/database';

type GetApplicationOptions = {
  withSchool?: boolean;
};

export async function getApplication<
  Selection extends SelectExpression<DB, 'applications'>
>(id: string, selections: Selection[], options: GetApplicationOptions = {}) {
  const result = await db
    .selectFrom('applications')
    .select(selections)
    .$if(!!options.withSchool, (qb) => {
      return qb
        .leftJoin('schools', 'schools.id', 'applications.schoolId')
        .select(['schools.name as school']);
    })
    .where('applications.id', '=', id)
    .executeTakeFirst();

  return result;
}
