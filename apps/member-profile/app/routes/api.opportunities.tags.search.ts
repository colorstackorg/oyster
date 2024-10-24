import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';

import { listOpportunityTags } from '@oyster/core/opportunities';

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams.get('search') || '';

  const tags = await listOpportunityTags({
    pagination: { limit: 25, page: 1 },
    select: [
      'opportunityTags.color',
      'opportunityTags.id',
      'opportunityTags.name',
    ],
    where: { search },
  });

  return json({
    tags,
  });
}

export type SearchOpportunityTagsResult = SerializeFrom<typeof loader>;
