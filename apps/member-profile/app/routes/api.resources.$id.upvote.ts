import { type ActionFunctionArgs, json } from '@remix-run/node';

import { upvoteResource } from '@/member-profile.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await upvoteResource(params.id as string, {
    memberId: user(session),
  });

  return json({});
}
