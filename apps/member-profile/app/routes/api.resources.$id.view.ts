import { type ActionFunctionArgs, json } from '@remix-run/node';

import { viewResource } from '@oyster/core/resources.server';
import { track } from '@oyster/infrastructure/mixpanel';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await viewResource(params.id as string, {
    memberId: user(session),
  });

  track({
    event: 'Resource Viewed',
    properties: undefined,
    request,
    user: user(session),
  });

  return json({});
}
