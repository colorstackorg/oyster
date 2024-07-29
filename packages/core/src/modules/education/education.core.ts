import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import {
  type CreateSchoolInput,
  type UpdateSchoolInput,
} from '@/modules/education/education.types';
import { type ListSearchParams } from '@/shared/types';

// Queries

type GetSchoolOptions<Selection> = {
  select: Selection[];
  where: { id: string };
};

export async function getSchool<
  Selection extends SelectExpression<DB, 'schools'>,
>({ select, where }: GetSchoolOptions<Selection>) {
  const school = await db
    .selectFrom('schools')
    .select(select)
    .where('id', '=', where.id)
    .executeTakeFirst();

  return school;
}

type ListSchoolsOptions<Selection> = {
  select: Selection[];
  where: Pick<ListSearchParams, 'search'>;
};

export async function listSchools<
  Selection extends SelectExpression<DB, 'schools'>,
>({ select, where }: ListSchoolsOptions<Selection>) {
  const { search } = where;

  const rows = await db
    .selectFrom('schools')
    .select(select)
    .$if(!!where.search, (qb) => {
      return qb
        .where(sql<boolean>`similarity(name, ${search}) > 0.15`)
        .where(sql<boolean>`word_similarity(name, ${search}) > 0.15`)
        .orderBy(sql`similarity(name, ${search})`, 'desc')
        .orderBy(sql`word_similarity(name, ${search})`, 'desc');
    })
    .$if(!where.search, (qb) => {
      return qb.orderBy('name', 'asc');
    })
    .limit(25)
    .execute();

  return rows;
}

// Mutations

export async function createSchool({
  addressCity,
  addressState,
  addressZip,
  name,
}: CreateSchoolInput) {
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('schools')
      .values({
        addressCity,
        addressState,
        addressZip,
        id: id(),
        name,
      })
      .execute();
  });
}

export async function updateSchool({
  addressCity,
  addressState,
  addressZip,
  id,
  name,
}: UpdateSchoolInput) {
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('schools')
      .set({
        addressCity,
        addressState,
        addressZip,
        name,
      })
      .where('id', '=', id)
      .execute();
  });
}
