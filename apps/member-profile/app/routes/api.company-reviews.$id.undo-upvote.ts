import { type ActionFunctionArgs } from '@remix-run/node';

import { undoUpvoteCompanyReview } from '@oyster/core/employment/server';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await undoUpvoteCompanyReview(params.id as string, {
    memberId: user(session),
  });

  return null;
}
