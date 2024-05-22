import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';

import { track } from '@oyster/infrastructure/mixpanel';

import { listTags } from '@/member-profile.server';
import { getSession, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams.get('search') || '';

  const tags = await listTags({
    limit: 10,
    page: 1,
    select: ['id', 'name'],
    where: { search },
  });

  return json({
    tags,
  });
}

export type SearchTagsResult = SerializeFrom<typeof loader>;
