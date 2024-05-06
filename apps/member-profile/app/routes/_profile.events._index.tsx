import { type LoaderFunctionArgs, redirect } from '@remix-run/node';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return redirect(Route['/events/upcoming']);
}
