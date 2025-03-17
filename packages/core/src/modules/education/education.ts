import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';
import { id, splitArray } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable';
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
  tags,
}: UpdateSchoolInput) {
  const previousSchool = await db
    .selectFrom('schools')
    .select('name')
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('schools')
      .set({
        addressCity,
        addressState,
        addressZip,
        name,
        tags,
      })
      .where('id', '=', id)
      .execute();
  });

  // If the name of the school has changed, then we need to update the Airtable
  // record for all members of the school (unfortunately because we're not
  // storing the schools in SQL-esque way).
  if (previousSchool.name !== name) {
    const members = await db
      .selectFrom('students')
      .select('airtableId')
      .where('schoolId', '=', id)
      .where('airtableId', 'is not', null)
      .execute();

    const memberChunks = splitArray(members, 10);

    memberChunks.forEach((chunk) => {
      job('airtable.record.update.bulk', {
        airtableBaseId: AIRTABLE_FAMILY_BASE_ID!,
        airtableTableId: AIRTABLE_MEMBERS_TABLE_ID!,
        records: chunk.map((member) => {
          return {
            id: member.airtableId!,
            data: {
              School: name,
            },
          };
        }),
      });
    });
  }
}
