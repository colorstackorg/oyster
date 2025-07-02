import { type LoaderFunctionArgs } from 'react-router';

import { listTags } from '@oyster/core/resources/server';
import { type SerializeFrom } from '@oyster/ui';

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams.get('search') || '';

  const tags = await listTags({
    pagination: { limit: 25, page: 1 },
    select: ['color', 'id', 'name'],
    where: { search },
  });

  return {
    tags,
  };
}

export type SearchTagsResult = SerializeFrom<typeof loader>;
