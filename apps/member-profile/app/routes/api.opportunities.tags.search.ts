import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams.get('search') || '';

  return json({
    tags: [],
  });
}

export type SearchOpportunityTagsResult = SerializeFrom<typeof loader>;
