import { sql } from 'kysely';
import { type LoaderFunctionArgs } from 'react-router';

import { db } from '@oyster/db';
import { type SerializeFrom } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const url = new URL(request.url);

  const search = url.searchParams.get('search') || '';

  const members = await searchMembers(search);

  return {
    members,
  };
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
