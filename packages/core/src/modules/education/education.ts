import { type SelectExpression, sql } from 'kysely';

import { db, type DB } from '@oyster/db';
import { id, splitArray } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
import { R2_PUBLIC_BUCKET_URL } from '@/infrastructure/s3';
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

export async function searchSchools(search: string) {
  const rows = await db
    .with('educationCounts', (qb) => {
      return qb
        .selectFrom('educations')
        .select(['schoolId', ({ fn }) => fn.countAll().as('count')])
        .where('educations.deletedAt', 'is', null)
        .groupBy('schoolId');
    })
    .with('studentCounts', (qb) => {
      return qb
        .selectFrom('students')
        .select(['schoolId', ({ fn }) => fn.countAll().as('count')])
        .groupBy('schoolId');
    })
    .with('applicationCounts', (qb) => {
      return qb
        .selectFrom('applications')
        .select(['schoolId', ({ fn }) => fn.countAll().as('count')])
        .groupBy('schoolId');
    })
    .with('relevance', (qb) => {
      return qb
        .selectFrom('schools')
        .leftJoin('educationCounts', 'educationCounts.schoolId', 'schools.id')
        .leftJoin('studentCounts', 'studentCounts.schoolId', 'schools.id')
        .leftJoin(
          'applicationCounts',
          'applicationCounts.schoolId',
          'schools.id'
        )
        .select([
          'schools.id',
          'schools.name',
          'schools.logoKey',
          ({ fn }) => {
            const educationCount = fn.coalesce(
              'educationCounts.count',
              sql.lit(0)
            );

            const studentCount = fn.coalesce('studentCounts.count', sql.lit(0));

            const applicationCount = fn.coalesce(
              'applicationCounts.count',
              sql.lit(0)
            );

            const popularity = sql<number>`log(
              1 +
              ${educationCount} * 1.0 +
              ${studentCount} * 1.0 +
              ${applicationCount} * 0.25
            )
            `.as('popularity');

            return popularity;
          },

          ({ eb }) => {
            return eb
              .case()
              .when('name', 'ilike', search)
              .then(sql.lit(1.0))
              .when('name', 'ilike', `${search}%`)
              .then(sql.lit(0.95))
              .when('name', 'ilike', `%${search}%`)
              .then(sql.lit(0.9))
              .else(
                sql<number>`greatest(
                  similarity(${eb.ref('name')}, ${search}),
                  word_similarity(${eb.ref('name')}, ${search})
                )`
              )
              .end()
              .as('score');
          },
        ])
        .where((eb) => {
          return eb.or([
            eb('name', 'ilike', `%${search}%`),
            eb(sql`similarity(${eb.ref('name')}, ${search})`, '>=', 0.25),
            eb(sql`word_similarity(${eb.ref('name')}, ${search})`, '>=', 0.5),
          ]);
        });
    })
    .with('adjusted', (qb) => {
      return qb.selectFrom('relevance').select([
        'id',
        'logoKey',
        'name',
        'popularity',
        'score',
        ({ ref }) => {
          const field = sql<number>`${ref('score')} + 0.05 * ${ref('popularity')}`;

          return field.as('totalScore');
        },
      ]);
    })
    .selectFrom('adjusted')
    .select(['id', 'logoKey', 'name', 'popularity', 'totalScore'])
    .orderBy('totalScore', 'desc')
    .orderBy('name', 'asc')
    .limit(25)
    .execute();

  const schools = rows.map(({ logoKey, ...row }) => {
    return {
      ...row,
      ...(logoKey && {
        logo: `${R2_PUBLIC_BUCKET_URL}/${logoKey}`,
      }),
    };
  });

  return schools;
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
        addressCountry: 'US',
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
        updatedAt: new Date(),
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
