import { type ActionFunctionArgs, json } from '@remix-run/node';

import { track } from '@oyster/core/mixpanel';
import { CreateTagInput } from '@oyster/core/resources';
import { createTag } from '@oyster/core/resources/server';
import { validateForm } from '@oyster/ui';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, ok } = await validateForm(request, CreateTagInput);

  if (!ok) {
    return json({}, { status: 400 });
  }

  await createTag({
    id: data.id,
    name: data.name,
  });

  track({
    event: 'Resource Tag Added',
    properties: undefined,
    request,
    user: user(session),
  });

  return json({});
}
