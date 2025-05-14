import { type LoaderFunctionArgs, redirect } from '@remix-run/node';

import { listQueueNames } from '@oyster/core/bull';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const queues = await listQueueNames();

  return redirect(`/bull/${queues[0]}`);
}
