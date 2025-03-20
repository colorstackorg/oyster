import { json, type LoaderFunctionArgs } from '@remix-run/node';

import { Text } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

// Page

export default function MyPeerHelpRequests() {
  // const {} = useLoaderData<typeof loader>();

  return <Text>Me</Text>;
}
