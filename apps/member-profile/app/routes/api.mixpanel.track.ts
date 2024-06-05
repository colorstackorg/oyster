import { type ActionFunctionArgs, json } from '@remix-run/node';

import { track } from '@oyster/infrastructure/mixpanel';

import { getSession, user } from '@/shared/session.server';

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);

  const data = await request.json();

  track({
    event: data.event,
    properties: data.properties,
    request,
    user: user(session),
  });

  return json({});
}
