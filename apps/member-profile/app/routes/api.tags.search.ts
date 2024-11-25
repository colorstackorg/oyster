import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';

import { listTags } from '@oyster/core/resources/server';

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams.get('search') || '';

  const tags = await listTags({
    pagination: { limit: 25, page: 1 },
    select: ['id', 'name'],
    where: { search },
  });

  return json({
    tags,
  });
}

export type SearchTagsResult = SerializeFrom<typeof loader>;
