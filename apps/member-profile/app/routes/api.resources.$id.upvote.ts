import { type ActionFunctionArgs } from 'react-router';

import { track } from '@oyster/core/mixpanel';
import { upvoteResource } from '@oyster/core/resources/server';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await upvoteResource(params.id as string, {
    memberId: user(session),
  });

  track({
    event: 'Resource Upvoted',
    properties: undefined,
    request,
    user: user(session),
  });

  return null;
}
