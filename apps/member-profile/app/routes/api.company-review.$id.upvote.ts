import { type ActionFunctionArgs, json } from '@remix-run/node';

import { upvoteCompanyReview } from '@oyster/core/employment.server';
import { track } from '@oyster/infrastructure/mixpanel';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await upvoteCompanyReview(params.id as string, {
    memberId: user(session),
  });

  track({
    event: 'Review Upvoted',
    properties: undefined,
    request,
    user: user(session),
  });

  return json({});
}
