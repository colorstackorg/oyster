import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { sql } from 'kysely';

import { db } from '@oyster/db';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const url = new URL(request.url);

  const search = url.searchParams.get('search') || '';

  const members = await searchMembers(search);

  return json({
    members,
  });
}

async function searchMembers(search: string) {
  const members = await db
    .selectFrom('students')
    .select(['email', 'id', 'firstName', 'lastName'])
    .$if(!!search, (query) => {
      return query.where((eb) => {
        return eb.or([
          eb('email', 'ilike', `%${search}%`),
          eb('firstName', 'ilike', `%${search}%`),
          eb('lastName', 'ilike', `%${search}%`),
          eb(sql`first_name || ' ' || last_name`, 'ilike', `%${search}%`),
        ]);
      });
    })
    .orderBy('createdAt', 'desc')
    .limit(10)
    .execute();

  return members;
}

export type SearchMembersResult = SerializeFrom<typeof loader>;
