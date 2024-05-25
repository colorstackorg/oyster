import { type ActionFunctionArgs, json } from '@remix-run/node';

import { createTag } from '@oyster/core/resources.server';
import { track } from '@oyster/infrastructure/mixpanel';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const data = await request.formData();

  const { id, name } = Object.fromEntries(data);

  await createTag({
    id: id as string,
    name: name as string,
  });

  track({
    event: 'Resource Tag Added',
    properties: undefined,
    request,
    user: user(session),
  });

  return json({});
}
