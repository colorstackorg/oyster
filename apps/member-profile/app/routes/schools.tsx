import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { sql } from 'kysely';
import { z } from 'zod';

import { db } from '../shared/core.server';

const SchoolsSearchParams = z.object({
  search: z.string().trim().min(1).catch(''),
});

type SchoolsSearchParams = z.infer<typeof SchoolsSearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const { search } = SchoolsSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  try {
    const schools = await listSchools(search);

    return json({
      schools,
    });
  } catch (e) {
    return json({
      schools: [],
    });
  }
}

async function listSchools(search: string) {
  let query = db.selectFrom('schools').select(['id', 'name']).limit(25);

  if (search) {
    query = query
      .where(sql<boolean>`similarity(name, ${search}) > 0.15`)
      .where(sql<boolean>`word_similarity(name, ${search}) > 0.15`)
      .orderBy(sql`similarity(name, ${search})`, 'desc')
      .orderBy(sql`word_similarity(name, ${search})`, 'desc');
  } else {
    query = query.orderBy('name', 'asc');
  }

  const rows = await query.execute();

  return rows;
}
