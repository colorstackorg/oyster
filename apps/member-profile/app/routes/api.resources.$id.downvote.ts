import { type ActionFunctionArgs, json } from '@remix-run/node';

import { downvoteResource } from '@/member-profile.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await downvoteResource(params.id as string, {
    memberId: user(session),
  });

  return json({});
}
