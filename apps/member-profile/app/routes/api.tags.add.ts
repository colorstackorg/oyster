import { type ActionFunctionArgs, data } from '@remix-run/node';

import { track } from '@oyster/core/mixpanel';
import { CreateTagInput } from '@oyster/core/resources';
import { createTag } from '@oyster/core/resources/server';
import { validateForm } from '@oyster/ui';

import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, CreateTagInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await createTag(result.data);

  track({
    event: 'Resource Tag Added',
    properties: undefined,
    request,
    user: user(session),
  });

  return null;
}
