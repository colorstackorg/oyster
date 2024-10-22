import { type ActionFunctionArgs, json } from '@remix-run/node';

import { bookmarkOpportunity } from '@oyster/core/opportunities';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const id = params.id as string;

  await bookmarkOpportunity(id, user(session));

  return json({});
}
