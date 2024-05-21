import { json, type LoaderFunctionArgs } from '@remix-run/node';

import { track } from '@oyster/infrastructure/mixpanel';

import { listTags } from '@/member-profile.server';
import { getSession, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const tags = await listTags({
    limit: 10,
    page: 1,
    select: ['name'],
    where: { search: '' },
  });

  return json({
    tags,
  });
}
