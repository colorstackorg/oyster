import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { generatePath } from '@remix-run/react';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return redirect(
    generatePath(Route['/bull/:queue/jobs'], {
      queue: params.queue as string,
    })
  );
}
