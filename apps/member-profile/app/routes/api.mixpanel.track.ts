import { type ActionFunctionArgs, json } from '@remix-run/node';

import { track } from '@oyster/infrastructure/mixpanel';

import { getSession, user } from '@/shared/session.server';

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);

  const form = await request.formData();
  const values = Object.fromEntries(form);

  track({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: values.event as any,
    properties: values.properties,
    request,
    user: user(session),
  });

  return json({});
}
