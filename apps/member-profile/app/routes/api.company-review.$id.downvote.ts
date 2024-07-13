import { type ActionFunctionArgs, json } from '@remix-run/node';

import { downvoteCompanyReview } from '@oyster/core/employment.server';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await downvoteCompanyReview(params.id as string, {
    memberId: user(session),
  });

  return json({});
}
